"""Explicit, cache-only OpenAlex collector using verified author IDs."""

from __future__ import annotations

import argparse
import json
import os
import random
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
REGISTRY_PATH = ROOT / ".cache" / "authors.json"
SNAPSHOT_PATH = ROOT / "data" / "publications.json"
API_URL = "https://api.openalex.org/works"
PER_PAGE = 100
MAX_ATTEMPTS = 250
MAX_RETRIES = 4
TIMEOUT_SECONDS = 30
MIN_REQUEST_INTERVAL_SECONDS = 0.12
SELECT_FIELDS = (
    "id,doi,display_name,publication_date,publication_year,type,authorships,"
    "primary_location,best_oa_location,is_retracted"
)


class CollectorError(RuntimeError):
    pass


@dataclass
class RequestBudget:
    attempts: int = 0
    last_request_at: float = 0.0

    def claim(self) -> None:
        if self.attempts >= MAX_ATTEMPTS:
            raise CollectorError(f"OpenAlex request cap reached ({MAX_ATTEMPTS} attempts).")
        wait = MIN_REQUEST_INTERVAL_SECONDS - (time.monotonic() - self.last_request_at)
        if wait > 0:
            time.sleep(wait)
        self.attempts += 1
        self.last_request_at = time.monotonic()


def load_env_key() -> str:
    key = os.environ.get("OPENALEX_API_KEY", "").strip()
    if key:
        return key
    env_file = ROOT / ".env.local"
    if env_file.exists():
        for raw_line in env_file.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            name, value = line.split("=", 1)
            if name.strip() == "OPENALEX_API_KEY":
                return value.strip().strip("\"'")
    raise CollectorError(
        "OPENALEX_API_KEY is not configured. Add the free key to the environment "
        "or ignored .env.local; no request was sent."
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Refresh cached works by verified OpenAlex author ID.")
    scope = parser.add_mutually_exclusive_group(required=True)
    scope.add_argument("--all", action="store_true")
    scope.add_argument("--person", action="append", default=[], help="stable person ID; repeatable")
    parser.add_argument("--dry-run", action="store_true", help="query and validate without replacing the cache")
    return parser.parse_args()


def load_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise CollectorError(f"Cannot read valid JSON from {path.relative_to(ROOT)}: {error}") from error
    if not isinstance(value, dict):
        raise CollectorError(f"{path.relative_to(ROOT)} must contain a JSON object.")
    return value


def selected_authors(registry: dict[str, Any], args: argparse.Namespace) -> list[dict[str, Any]]:
    authors = registry.get("authors")
    if not isinstance(authors, list):
        raise CollectorError(".cache/authors.json has no valid authors array; rerun content:export-authors.")
    by_id = {author.get("person_id"): author for author in authors if isinstance(author, dict)}
    if args.all:
        requested = sorted(
            person_id for person_id, author in by_id.items()
            if isinstance(author.get("openalex_ids"), list) and author["openalex_ids"]
        )
    else:
        requested = list(dict.fromkeys(args.person))
    unknown = [person_id for person_id in requested if person_id not in by_id]
    if unknown:
        raise CollectorError(f"Unknown or publication-disabled person ID(s): {', '.join(unknown)}")
    if not requested:
        raise CollectorError("No publication-enabled people have verified OpenAlex IDs; no request was sent.")
    selected = []
    for person_id in requested:
        author = by_id[person_id]
        ids = author.get("openalex_ids")
        if not isinstance(ids, list) or not ids:
            raise CollectorError(f"{person_id} has no verified OpenAlex author ID; no request was sent.")
        if any(not isinstance(value, str) or not value.startswith("A") or not value[1:].isdigit() for value in ids):
            raise CollectorError(f"{person_id} has a malformed OpenAlex author ID; no request was sent.")
        selected.append(author)
    return selected


def retry_delay(headers: Any, attempt_index: int) -> float:
    value = headers.get("Retry-After") if headers else None
    if value:
        try:
            return min(60.0, max(0.0, float(value)))
        except ValueError:
            try:
                parsed = parsedate_to_datetime(value)
                return min(60.0, max(0.0, (parsed - datetime.now(timezone.utc)).total_seconds()))
            except (TypeError, ValueError):
                pass
    return min(30.0, (2**attempt_index) + random.random())


def request_json(url: str, key: str, budget: RequestBudget) -> dict[str, Any]:
    for retry_index in range(MAX_RETRIES):
        budget.claim()
        request = urllib.request.Request(
            url,
            headers={
                "Authorization": f"Bearer {key}",
                "Accept": "application/json",
                "User-Agent": "CSML-IIT-publication-collector/1.0",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
                payload = json.loads(response.read().decode("utf-8"))
                if not isinstance(payload, dict):
                    raise CollectorError("OpenAlex returned a non-object response.")
                return payload
        except urllib.error.HTTPError as error:
            if error.code in (401, 403):
                raise CollectorError("OpenAlex rejected the API key or allowance; the cache was not changed.") from error
            if error.code != 429 and not 500 <= error.code < 600:
                raise CollectorError(f"OpenAlex returned HTTP {error.code}; the cache was not changed.") from error
            if retry_index == MAX_RETRIES - 1:
                raise CollectorError(f"OpenAlex remained unavailable after {MAX_RETRIES} attempts.") from error
            time.sleep(retry_delay(error.headers, retry_index))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            if retry_index == MAX_RETRIES - 1:
                raise CollectorError(f"OpenAlex request failed after {MAX_RETRIES} attempts: {error}") from error
            time.sleep(retry_delay(None, retry_index))
    raise CollectorError("OpenAlex request failed unexpectedly.")


def fetch_author_works(author_id: str, key: str, budget: RequestBudget) -> list[dict[str, Any]]:
    cursor = "*"
    seen_cursors: set[str] = set()
    works: list[dict[str, Any]] = []
    while cursor:
        if cursor in seen_cursors:
            raise CollectorError(f"OpenAlex repeated a cursor for {author_id}; the cache was not changed.")
        seen_cursors.add(cursor)
        query = urllib.parse.urlencode(
            {
                "filter": f"author.id:{author_id}",
                "per-page": str(PER_PAGE),
                "cursor": cursor,
                "select": SELECT_FIELDS,
            }
        )
        payload = request_json(f"{API_URL}?{query}", key, budget)
        page = payload.get("results")
        meta = payload.get("meta")
        if not isinstance(page, list) or not isinstance(meta, dict):
            raise CollectorError(f"OpenAlex returned malformed pagination data for {author_id}.")
        for work in page:
            if not isinstance(work, dict) or not isinstance(work.get("id"), str) or not isinstance(work.get("display_name"), str):
                raise CollectorError(f"OpenAlex returned a malformed work for {author_id}.")
            works.append(work)
        next_cursor = meta.get("next_cursor")
        if next_cursor is not None and not isinstance(next_cursor, str):
            raise CollectorError(f"OpenAlex returned a malformed next cursor for {author_id}.")
        cursor = next_cursor or ""
    return works


def optional_string(value: Any) -> str | None:
    return value if isinstance(value, str) and value else None


def normalize_work(work: dict[str, Any], member_id: str) -> dict[str, Any]:
    authors: list[str] = []
    if isinstance(work.get("authorships"), list):
        for authorship in work["authorships"]:
            author = authorship.get("author") if isinstance(authorship, dict) else None
            name = author.get("display_name") if isinstance(author, dict) else None
            if isinstance(name, str) and name:
                authors.append(name)
    primary = work.get("primary_location") if isinstance(work.get("primary_location"), dict) else {}
    source = primary.get("source") if isinstance(primary.get("source"), dict) else {}
    best_oa = work.get("best_oa_location") if isinstance(work.get("best_oa_location"), dict) else {}
    open_access_url = optional_string(best_oa.get("landing_page_url")) or optional_string(best_oa.get("pdf_url"))
    doi = optional_string(work.get("doi"))
    if doi:
        doi = doi.removeprefix("https://doi.org/").removeprefix("http://doi.org/").lower()
    year = work.get("publication_year")
    return {
        "id": work["id"],
        "source": "OpenAlex",
        "source_url": work["id"],
        "doi": doi,
        "title": work["display_name"],
        "publication_year": year if isinstance(year, int) else None,
        "publication_date": optional_string(work.get("publication_date")),
        "type": optional_string(work.get("type")) or "unknown",
        "authors": authors,
        "member_ids": [member_id],
        "venue": optional_string(source.get("display_name")),
        "landing_page_url": optional_string(primary.get("landing_page_url")),
        "open_access_url": open_access_url,
        "is_retracted": bool(work.get("is_retracted", False)),
    }


def merge_selected(
    snapshot: dict[str, Any],
    selected: list[dict[str, Any]],
    fetched: dict[str, list[dict[str, Any]]],
    registry_signature: str,
    full_refresh: bool,
    prune_ids: set[str] | None = None,
) -> dict[str, Any]:
    selected_ids = {author["person_id"] for author in selected}
    # On a full refresh, drop stale membership edges for every publication-enabled
    # person re-evaluated this run, including one who no longer has a verified
    # OpenAlex ID (and so is absent from `selected`) -- otherwise their old,
    # possibly misattributed works would never be cleared by a later --all run.
    ids_to_prune = prune_ids if prune_ids is not None else selected_ids
    existing_records = snapshot.get("records")
    if not isinstance(existing_records, list):
        raise CollectorError("data/publications.json has no valid records array.")
    records: dict[str, dict[str, Any]] = {}
    for record in existing_records:
        if not isinstance(record, dict) or not isinstance(record.get("id"), str):
            raise CollectorError("The existing publication cache contains a malformed record.")
        retained_members = sorted(set(record.get("member_ids", [])) - ids_to_prune)
        if retained_members:
            records[record["id"]] = {**record, "member_ids": retained_members}

    old_counts = {
        person_id: sum(person_id in record.get("member_ids", []) for record in existing_records if isinstance(record, dict))
        for person_id in selected_ids
    }
    for author in selected:
        person_id = author["person_id"]
        new_works = fetched[person_id]
        old_count = old_counts[person_id]
        if old_count >= 5 and len(new_works) < old_count * 0.8:
            raise CollectorError(
                f"Refusing suspicious drop for {person_id}: {old_count} cached works -> {len(new_works)} fetched works."
            )
        for raw_work in new_works:
            normalized = normalize_work(raw_work, person_id)
            prior = records.get(normalized["id"])
            if prior:
                normalized["member_ids"] = sorted(set(prior.get("member_ids", [])) | {person_id})
            records[normalized["id"]] = normalized

    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    coverage = snapshot.get("coverage_by_person")
    if not isinstance(coverage, dict):
        raise CollectorError("data/publications.json has no valid coverage_by_person object.")
    coverage = dict(coverage)
    for author in selected:
        person_id = author["person_id"]
        coverage[person_id] = {
            "author_ids": sorted(author["openalex_ids"]),
            "last_successful_refresh_at": now,
            "works_count": len(fetched[person_id]),
            "status": "complete",
        }
    # A person pruned from records (above) but not re-fetched (no verified ID any
    # more) must not keep claiming stale coverage from their old, now-removed ID.
    for person_id in ids_to_prune - selected_ids:
        coverage.pop(person_id, None)

    ordered_records = sorted(
        records.values(),
        key=lambda record: (-(record.get("publication_year") or -1), record.get("title", "").casefold(), record["id"]),
    )
    queried_ids = sorted(
        {
            author_id
            for item in coverage.values()
            if isinstance(item, dict)
            for author_id in item.get("author_ids", [])
            if isinstance(author_id, str)
        }
    )
    return {
        "version": 1,
        "source": "OpenAlex",
        "last_full_refresh_at": now if full_refresh else snapshot.get("last_full_refresh_at"),
        "author_roster_signature": registry_signature,
        "queried_author_ids": queried_ids,
        "coverage_by_person": coverage,
        "mapping_warnings": [],
        "records": ordered_records,
    }


def atomic_write(path: Path, value: dict[str, Any]) -> None:
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            json.dump(value, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary_name, path)
    finally:
        if os.path.exists(temporary_name):
            os.unlink(temporary_name)


def main() -> int:
    args = parse_args()
    registry = load_json(REGISTRY_PATH)
    selected = selected_authors(registry, args)
    key = load_env_key()
    budget = RequestBudget()
    fetched: dict[str, list[dict[str, Any]]] = {}
    for author in selected:
        works_by_id: dict[str, dict[str, Any]] = {}
        for author_id in author["openalex_ids"]:
            for work in fetch_author_works(author_id, key, budget):
                works_by_id[work["id"]] = work
        fetched[author["person_id"]] = list(works_by_id.values())

    snapshot = load_json(SNAPSHOT_PATH)
    prune_ids = None
    if args.all:
        authors = registry.get("authors")
        prune_ids = {author["person_id"] for author in authors if isinstance(author, dict)}
    candidate = merge_selected(snapshot, selected, fetched, registry["signature"], args.all, prune_ids)
    counts = ", ".join(f"{author['person_id']}={len(fetched[author['person_id']])}" for author in selected)
    if args.dry_run:
        print(f"Dry run valid ({budget.attempts} HTTP attempts; {counts}); cache unchanged.")
    else:
        atomic_write(SNAPSHOT_PATH, candidate)
        print(f"Publication cache updated atomically ({budget.attempts} HTTP attempts; {counts}).")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except CollectorError as error:
        print(f"Publication refresh failed: {error}", file=os.sys.stderr)
        raise SystemExit(1)

# Automated laboratory publications: OpenAlex + GitHub Actions

**Implementation guide | 13 October 2026**

## Objective

Collect publications from a list of laboratory researchers using the **free OpenAlex API**, run the collection automatically once a week on **GitHub Actions**, and maintain a deduplicated `data/publications.json` in a GitHub repository.

**Scope:** This guide automates *bibliography collection*. It does **not** automatically insert papers into a Google Scholar profile: Scholar does not offer an official publication-write API. That can be considered separately.

## 1. Free-tier constraints (verified 13 October 2026)

Create a free OpenAlex account and get an API key at <https://openalex.org/settings/api>. No payment method is required for the free tier.

| Item | Free API key |
|---|---|
| Daily API allowance | **$1/day**, resetting at midnight UTC |
| Filtered-list request (`/works?filter=...`) | **$0.0001 per call**, approximately **10,000 calls/day** for the full allowance |
| Text-search request (`?search=...`) | **$0.001 per call**, approximately 1,000 searches/day for the full allowance |
| Single-entity lookup by ID or DOI | Free |
| Maximum page size | 100 results |
| Author IDs in a single OR filter | 100 IDs |
| Rate limit with free key | 30 requests/second; lower limits apply to some complex queries |

**Cost-minimizing strategy:**

- Use `filter=author.id:ID1|ID2|...` rather than searching by names for every run.
- Batch up to 100 author IDs in one filter.
- Use `per_page=100` and cursor pagination.
- Run **once a week**, not continuously.
- Put a hard cap on the number of list requests per run (the example below allows **250**: at most **$0.025** of list requests, assuming no other query types).
- Do not add billing or prepaid credits; if the shared daily budget is exhausted, stop and retry next week or manually after the daily reset.
- Be mindful that other applications using the same API key consume the same daily budget.

**Important:** OpenAlex's `from_updated_date`/`from_created_date` filters require a paid plan. This implementation does not use them. A weekly complete author-list refresh is a simple free-tier alternative.

Current pricing and rate-limit documentation:
- <https://help.openalex.org/access/pricing/>
- <https://help.openalex.org/access/example-costs/>
- <https://help.openalex.org/api/authentication/>

## 2. Set up author identifiers

Resolve each member's OpenAlex ID **once** (confirm the identity using affiliation, publication history, or ORCID):

```text
GET https://api.openalex.org/authors?search=Researcher%20Name
GET https://api.openalex.org/authors?filter=orcid:0000-0000-0000-0000
```

The ORCID in the example is a placeholder. OpenAlex author IDs have a form like `A1234567890` or `https://openalex.org/A1234567890`.

Create `authors.json`:

```json
{
  "author_ids": [
    "A1234567890",
    "A9876543210"
  ]
}
```

**Replace the IDs with real identifiers before running.** Keep this file updated when laboratory membership changes; publication harvesting itself is automatic.

API docs: <https://help.openalex.org/data/authors/>.

## 3. API query pattern

For two authors, the request is conceptually:

```text
GET https://api.openalex.org/works
  ?filter=author.id:A1234567890|A9876543210
  &per_page=100
  &cursor=*
  &select=id,doi,display_name,publication_date,publication_year,type,authorships
```

Send the API key through `Authorization: Bearer YOUR_KEY` (preferred over putting it into logged URLs). Encode parameters with an HTTP client such as Python `requests` rather than assembling URLs manually.

- The response contains the current page in `results`.
- Use `meta.next_cursor` for the next page until no further page exists.
- Save results by OpenAlex work `id`, which deduplicates papers coauthored by multiple members.
- `select=` supports root-level fields, including `authorships`; it does not support nested field selection.
- OpenAlex defaults to its curated `core` corpus. Use `corpus=all` only if broader, noisier coverage is explicitly desired.

Useful docs:
- <https://help.openalex.org/api/filtering/>
- <https://help.openalex.org/api/paging/>
- <https://help.openalex.org/api/selecting-fields/>
- <https://help.openalex.org/data/works/corpus/>

## 4. Minimal project layout

```text
lab-publications/
├── authors.json
├── scripts/
│   └── sync_openalex.py
├── data/
│   └── publications.json       # generated
└── .github/
    └── workflows/
        └── update.yml
```

### `scripts/sync_openalex.py`

A minimal runnable collector is below. It avoids paid update filters and does not overwrite existing output if the run fails.

```python
import json
import os
import time
from pathlib import Path

import requests

BASE_URL = "https://api.openalex.org/works"
MAX_LIST_CALLS = 250  # 250 x $0.0001 = $0.025 maximum for successful list calls
PAGE_SIZE = 100


def get_page(session, params):
    for attempt in range(5):
        response = session.get(BASE_URL, params=params, timeout=30)
        if response.status_code == 429:
            if "not_enough_credits" in response.text:
                raise RuntimeError("OpenAlex free daily budget exhausted")
            time.sleep(2 ** attempt)
            continue
        if response.status_code in (500, 502, 503, 504):
            time.sleep(2 ** attempt)
            continue
        response.raise_for_status()
        return response.json()
    raise RuntimeError("OpenAlex request failed after retries")


def main():
    key = os.environ["OPENALEX_API_KEY"]
    config = json.loads(Path("authors.json").read_text())
    ids = sorted({value.rstrip("/").split("/")[-1]
                  for value in config["author_ids"]})
    if not ids:
        raise ValueError("authors.json has no author IDs")

    works = {}
    calls = 0
    session = requests.Session()
    session.headers.update({"Authorization": f"Bearer {key}"})

    for i in range(0, len(ids), 100):
        author_batch = ids[i:i + 100]
        cursor = "*"
        while cursor is not None:
            if calls >= MAX_LIST_CALLS:
                raise RuntimeError("Safety cap reached; output left unchanged")
            params = {
                "filter": "author.id:" + "|".join(author_batch),
                "per_page": PAGE_SIZE,
                "cursor": cursor,
                "select": "id,doi,display_name,publication_date,"
                          "publication_year,type,authorships",
            }
            page = get_page(session, params)
            calls += 1
            for work in page["results"]:
                works[work["id"]] = work
            cursor = page["meta"].get("next_cursor")
            if not page["results"]:
                break
            time.sleep(0.25)  # Conservative pacing

    output = Path("data/publications.json")
    output.parent.mkdir(parents=True, exist_ok=True)
    temp = output.with_suffix(".json.tmp")
    temp.write_text(
        json.dumps([works[k] for k in sorted(works)], indent=2,
                   ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    temp.replace(output)  # Replace only after complete success
    print(f"Saved {len(works)} unique publications in {calls} list calls")


if __name__ == "__main__":
    main()
```

**Notes:** The request cap is a per-run guard, not an account-wide free-budget tracker. OpenAlex also exposes `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and an endpoint `GET /rate-limit` to check the shared key's remaining allowance. For production use, add a preflight allowance check if multiple applications share the key. The script intentionally exports OpenAlex records as returned; it does not yet implement publication-date or type eligibility policies.

## 5. Automate with GitHub Actions

1. Create a repository and add `authors.json` and `scripts/sync_openalex.py`.
2. In **Settings > Secrets and variables > Actions**, create a repository secret named `OPENALEX_API_KEY`.
3. Create `.github/workflows/update.yml` as follows.
4. Run it initially with **Actions > Update lab publications > Run workflow** to test.

### `.github/workflows/update.yml`

```yaml
name: Update lab publications

on:
  schedule:
    - cron: "17 6 * * 1"  # Mondays at 06:17 UTC
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: openalex-publications
  cancel-in-progress: false

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install requests
      - name: Query OpenAlex
        env:
          OPENALEX_API_KEY: ${{ secrets.OPENALEX_API_KEY }}
        run: python scripts/sync_openalex.py
      - name: Commit publications if changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add data/publications.json
          if ! git diff --cached --quiet; then
            git commit -m "Update laboratory publications"
            git push
          fi
```

Scheduling uses GitHub's default branch; runs may be delayed or occasionally skipped. Using a complete refresh ensures the next successful run catches up. GitHub Actions has its *own* usage allowances (particularly for private repositories), independent of OpenAlex's free budget.

GitHub documentation:
- <https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule>
- <https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions>

## 6. Operational checklist

- [ ] OpenAlex account and free API key created; **no billing configured**.
- [ ] Correct OpenAlex IDs saved in `authors.json`.
- [ ] Local execution works: `OPENALEX_API_KEY=... python scripts/sync_openalex.py` (with `requests` installed).
- [ ] GitHub secret configured (do not commit the key).
- [ ] Manual GitHub Actions run succeeds and commits `data/publications.json`.
- [ ] Weekly schedule enabled.
- [ ] The generated JSON is stable across repeat runs unless OpenAlex metadata changes.
- [ ] If OpenAlex returns a budget or rate-limit error, the workflow fails without overwriting the previous file.

## 7. Logical next steps (optional)

Once the weekly collection works, add only what is needed: BibTeX export, website integration, or an exception report. Keep any experimental Google Scholar UI automation independent; Google Scholar does **not** have an official API to add publications to a profile.

## References

- OpenAlex API: <https://help.openalex.org/api/>
- Authentication and usage monitoring: <https://help.openalex.org/api/authentication/>
- Costs: <https://help.openalex.org/access/example-costs/>
- Filtering: <https://help.openalex.org/api/filtering/>
- Pagination: <https://help.openalex.org/api/paging/>
- GitHub Actions schedule: <https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule>

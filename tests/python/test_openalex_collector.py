import argparse
import importlib.util
import sys
import unittest
from pathlib import Path
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    "openalex_collector", ROOT / "scripts" / "openalex_collector.py"
)
collector = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = collector
SPEC.loader.exec_module(collector)


def work(work_id, title, year=2025):
    return {
        "id": f"https://openalex.org/{work_id}",
        "doi": None,
        "display_name": title,
        "publication_date": f"{year}-01-01",
        "publication_year": year,
        "type": "article",
        "authorships": [],
        "primary_location": None,
        "best_oa_location": None,
        "is_retracted": False,
    }


class OpenAlexCollectorTest(unittest.TestCase):
    def test_fetch_filters_by_exact_author_id(self):
        requested_urls = []
        original_request = collector.request_json

        def fake_request(url, _key, _budget):
            requested_urls.append(url)
            return {"results": [work("W1", "Direct result")], "meta": {"next_cursor": None}}

        collector.request_json = fake_request
        try:
            results = collector.fetch_author_works(
                "A5089972466", "secret-not-logged", collector.RequestBudget()
            )
        finally:
            collector.request_json = original_request

        query = parse_qs(urlparse(requested_urls[0]).query)
        self.assertEqual(query["filter"], ["author.id:A5089972466"])
        self.assertEqual(query["per-page"], ["100"])
        self.assertEqual(len(results), 1)

    def test_selected_author_requires_verified_ids_before_http(self):
        registry = {
            "authors": [
                {"person_id": "linked", "openalex_ids": ["A123"]},
                {"person_id": "unlinked", "openalex_ids": []},
            ]
        }
        selected = collector.selected_authors(
            registry, argparse.Namespace(all=False, person=["linked"])
        )
        self.assertEqual(selected[0]["openalex_ids"], ["A123"])
        with self.assertRaisesRegex(collector.CollectorError, "no verified OpenAlex"):
            collector.selected_authors(
                registry, argparse.Namespace(all=False, person=["unlinked"])
            )

    def test_targeted_merge_replaces_only_selected_membership(self):
        snapshot = {
            "last_full_refresh_at": "2026-01-01T00:00:00Z",
            "coverage_by_person": {
                "other": {
                    "author_ids": ["A999"],
                    "last_successful_refresh_at": "2026-01-01T00:00:00Z",
                    "works_count": 2,
                }
            },
            "records": [
                {**collector.normalize_work(work("W1", "Shared old"), "daniel-ordonez"), "member_ids": ["daniel-ordonez", "other"]},
                collector.normalize_work(work("W2", "Other only"), "other"),
                collector.normalize_work(work("W3", "Daniel old"), "daniel-ordonez"),
            ],
        }
        selected = [{"person_id": "daniel-ordonez", "openalex_ids": ["A5089972466"]}]
        result = collector.merge_selected(
            snapshot,
            selected,
            {"daniel-ordonez": [work("W1", "Shared updated"), work("W4", "Daniel new")]},
            "signature",
            False,
        )
        by_id = {record["id"]: record for record in result["records"]}
        self.assertNotIn("https://openalex.org/W3", by_id)
        self.assertEqual(by_id["https://openalex.org/W1"]["member_ids"], ["daniel-ordonez", "other"])
        self.assertEqual(by_id["https://openalex.org/W2"]["member_ids"], ["other"])
        self.assertEqual(by_id["https://openalex.org/W4"]["member_ids"], ["daniel-ordonez"])
        self.assertEqual(result["last_full_refresh_at"], "2026-01-01T00:00:00Z")
        self.assertEqual(result["coverage_by_person"]["other"], snapshot["coverage_by_person"]["other"])

    def test_full_refresh_drops_records_for_person_who_lost_their_id(self):
        # A full (--all) refresh must clear a person's old membership edges and
        # coverage entry once their verified OpenAlex ID is removed from the
        # registry, even though they're absent from `selected` (no ID -> no
        # fetch). Otherwise a merged/misattributed OpenAlex profile that was
        # unlinked for safety would keep publishing its stale, wrong records.
        snapshot = {
            "last_full_refresh_at": "2026-01-01T00:00:00Z",
            "coverage_by_person": {
                "delinked": {
                    "author_ids": ["A999"],
                    "last_successful_refresh_at": "2026-01-01T00:00:00Z",
                    "works_count": 1,
                },
            },
            "records": [
                collector.normalize_work(work("W1", "Delinked only"), "delinked"),
                {**collector.normalize_work(work("W2", "Unrelated"), "other"), "member_ids": ["other"]},
            ],
        }
        selected = [{"person_id": "daniel-ordonez", "openalex_ids": ["A5089972466"]}]
        result = collector.merge_selected(
            snapshot,
            selected,
            {"daniel-ordonez": [work("W3", "Daniel new")]},
            "signature",
            True,
            {"daniel-ordonez", "delinked"},
        )
        by_id = {record["id"]: record for record in result["records"]}
        self.assertNotIn("https://openalex.org/W1", by_id)
        self.assertEqual(by_id["https://openalex.org/W2"]["member_ids"], ["other"])
        self.assertIn("https://openalex.org/W3", by_id)
        self.assertNotIn("delinked", result["coverage_by_person"])


if __name__ == "__main__":
    unittest.main()

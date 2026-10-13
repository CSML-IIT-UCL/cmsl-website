import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class SnapshotContractsTest(unittest.TestCase):
    def test_publications_snapshot_has_valid_durable_shape(self):
        snapshot = json.loads((ROOT / "data/publications.json").read_text())
        self.assertEqual(snapshot["version"], 1)
        self.assertEqual(snapshot["source"], "OpenAlex")
        self.assertIsInstance(snapshot["queried_author_ids"], list)
        self.assertIsInstance(snapshot["coverage_by_person"], dict)
        self.assertIsInstance(snapshot["mapping_warnings"], list)
        self.assertIsInstance(snapshot["records"], list)

        record_ids = []
        for record in snapshot["records"]:
            self.assertIsInstance(record["id"], str)
            self.assertEqual(record["source"], "OpenAlex")
            self.assertIsInstance(record["title"], str)
            self.assertIsInstance(record["authors"], list)
            self.assertIsInstance(record["member_ids"], list)
            record_ids.append(record["id"])

        self.assertEqual(len(record_ids), len(set(record_ids)))
        for person_id, coverage in snapshot["coverage_by_person"].items():
            self.assertEqual(coverage["status"], "complete")
            self.assertTrue(set(coverage["author_ids"]).issubset(snapshot["queried_author_ids"]))
            linked_count = sum(
                person_id in record["member_ids"] for record in snapshot["records"]
            )
            self.assertEqual(coverage["works_count"], linked_count)

    def test_blog_bootstrap_is_honestly_empty(self):
        snapshot = json.loads((ROOT / "data/blog.json").read_text())
        self.assertEqual(snapshot["version"], 1)
        self.assertIsNone(snapshot["last_full_refresh_at"])
        self.assertEqual(snapshot["entries"], [])


if __name__ == "__main__":
    unittest.main()

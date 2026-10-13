import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class SnapshotContractsTest(unittest.TestCase):
    def test_publications_bootstrap_is_honestly_empty(self):
        snapshot = json.loads((ROOT / "data/publications.json").read_text())
        self.assertEqual(snapshot["version"], 1)
        self.assertIsNone(snapshot["last_full_refresh_at"])
        self.assertEqual(snapshot["records"], [])

    def test_blog_bootstrap_is_honestly_empty(self):
        snapshot = json.loads((ROOT / "data/blog.json").read_text())
        self.assertEqual(snapshot["version"], 1)
        self.assertIsNone(snapshot["last_full_refresh_at"])
        self.assertEqual(snapshot["entries"], [])


if __name__ == "__main__":
    unittest.main()

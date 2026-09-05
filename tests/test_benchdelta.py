import json, tempfile, unittest
from pathlib import Path
from benchdelta import compare, load, main


class BenchTests(unittest.TestCase):
    def test_regression(self):
        self.assertEqual(compare({"a": 1}, {"a": 1.2})[0]["status"], "regression")

    def test_boundary(self):
        self.assertEqual(compare({"a": 1}, {"a": 1.1})[0]["status"], "within-budget")

    def test_improved(self):
        self.assertEqual(compare({"a": 2}, {"a": 1})[0]["status"], "improvement")

    def test_added_removed(self):
        self.assertEqual(
            [r["status"] for r in compare({"a": 1}, {"b": 1})], ["removed", "added"]
        )

    def test_bad_threshold(self):
        for x in [-1, float("nan"), float("inf")]:
            with self.subTest(x=x), self.assertRaises(ValueError):
                compare({"a": 1}, {"a": 1}, x)

    def test_load_validation(self):
        for mean in [0, -1, True, "1", float("nan")]:
            with self.subTest(mean=mean), tempfile.TemporaryDirectory() as d:
                p = Path(d) / "a.json"
                p.write_text(json.dumps({"results": [{"command": "a", "mean": mean}]}))
                with self.assertRaises(ValueError):
                    load(p)

    def test_duplicates(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "a"
            p.write_text(
                '{"results":[{"command":"a","mean":1},{"command":"a","mean":2}]}'
            )
            with self.assertRaises(ValueError):
                load(p)

    def test_missing(self):
        self.assertEqual(main(["absent", "also-absent"]), 2)

    def test_html_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "report.html"
            args = ["examples/before.json", "examples/after.json", "--html", str(p)]
            self.assertEqual(main(args), 1)
            self.assertTrue(p.exists())
            self.assertEqual(main(args), 2)

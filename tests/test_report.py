import unittest
from report_ui import render


class ReportTests(unittest.TestCase):
    def test_script_escape(self):
        text = render("<Title>", ["x"], [{"x": "</script><img onerror=alert(1)>"}])
        self.assertNotIn("</script><img", text)
        self.assertIn(chr(92) + "u003c", text)
        self.assertIn("&lt;Title&gt;", text)

    def test_no_external_assets(self):
        text = render("Demo", ["a"], [{"a": 1}])
        self.assertNotIn('src="http', text)

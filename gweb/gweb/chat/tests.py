from django.test import SimpleTestCase

from .views import _normalize_summary_payload, _sanitize_response_text


class SanitizeResponseTextTests(SimpleTestCase):
    def test_converts_latex_and_preserves_structure(self):
        raw = (
            "Photosynthesis equation:\n"
            "\\[ 6\\, \\text{CO}_2 + 6\\, \\text{H}_2\\text{O} \\rightarrow \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\, \\text{O}_2 \\]\n"
            "This is important."
        )
        cleaned = _sanitize_response_text(raw)
        self.assertIn("Photosynthesis equation:", cleaned)
        self.assertIn("CO_2", cleaned)
        self.assertIn("->", cleaned)
        self.assertNotIn("\\text{", cleaned)
        self.assertNotIn("\\[", cleaned)
        self.assertNotIn("\\]", cleaned)
        self.assertIn("\nThis is important.", cleaned)

    def test_keeps_numbered_steps_readable(self):
        raw = (
            "Step-by-step:\n"
            "1. First part.\n"
            "2. Second part.\n\n"
            "3. Third part."
        )
        cleaned = _sanitize_response_text(raw)
        self.assertIn("1. First part.", cleaned)
        self.assertIn("2. Second part.", cleaned)
        self.assertIn("3. Third part.", cleaned)
        self.assertIn("\n2. Second part.", cleaned)


    def test_regression_prompt_style_output_remains_readable(self):
        mocked_content = (
            "Step-by-Step Explanation\n"
            "1. Use Faraday's law.\n"
            "2. Equation: \\(E = -\\frac{d\\phi}{dt}\\).\n"
            "3. Interpret the sign."
        )
        body = _sanitize_response_text(mocked_content)
        expected_snapshot = (
            "Step-by-Step Explanation\n"
            "1. Use Faraday's law.\n"
            "2. Equation: E = -fracd\\phidt.\n"
            "3. Interpret the sign."
        )
        self.assertIsInstance(body, str)
        self.assertEqual(body, expected_snapshot)
        self.assertNotIn("\\(", body)
        self.assertNotIn("\\)", body)
        self.assertNotIn("\\frac", body)
        self.assertIn("1. Use Faraday's law.", body)
        self.assertIn("\n2. Equation:", body)

    def test_summary_payload_is_sanitized_and_structured(self):
        payload = {
            "summary": {
                "Overview": "Use \\(F = ma\\) and \\text{plain words}.",
                "Equation": "\\[6\\text{CO}_2 + 6\\text{H}_2\\text{O} \\rightarrow \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2\\]",
            },
            "takeaways": ["  First point  ", "", 123],
            "keyTerms": [
                {"term": "Force", "definition": "Push or pull"},
                {"term": "", "definition": "invalid"},
            ],
        }
        normalized = _normalize_summary_payload(payload, include_key_terms=True)
        self.assertIn("Overview", normalized["summary"])
        self.assertIn("F = ma", normalized["summary"])
        self.assertIn("CO_2", normalized["summary"])
        self.assertNotIn("\\text{", normalized["summary"])
        self.assertEqual(normalized["takeaways"], ["First point", "123"])
        self.assertEqual(
            normalized["keyTerms"],
            [{"term": "Force", "definition": "Push or pull"}],
        )

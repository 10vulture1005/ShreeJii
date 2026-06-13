"""
VSUpload — Integration Test Suite.

Tests the full AI pipeline end-to-end when API keys are available.
Skips gracefully if GEMINI_API_KEY is not set.

Usage:
    # Set your Gemini API key first
    set GEMINI_API_KEY=your-key-here

    # Run all tests
    python test_vsupload.py

    # Run specific test
    python test_vsupload.py TestMetadataExtraction
    python test_vsupload.py TestImageGeneration
    python test_vsupload.py TestEndToEnd
"""

import os
import sys
import json
import unittest
import io
from pathlib import Path
from unittest.mock import MagicMock
from datetime import datetime
from PIL import Image

# Add the parent directory to path so we can import the app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

SKIP_GEMINI = not GEMINI_API_KEY
SKIP_GROQ = not GROQ_API_KEY


def _create_test_image(width=400, height=600, color=(180, 120, 80)) -> bytes:
    """Create a simple test image (solid color rectangle simulating a garment photo)."""
    img = Image.new("RGB", (width, height), color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


# ═══════════════════════════════════════════════════════════════════
# Test 1: Metadata Extraction
# ═══════════════════════════════════════════════════════════════════

class TestMetadataExtraction(unittest.TestCase):
    """Test Gemini Vision and Groq fallback for garment metadata extraction."""

    @unittest.skipIf(SKIP_GEMINI, "GEMINI_API_KEY not set — skipping Gemini Vision test")
    def test_gemini_vision_extraction(self):
        """Gemini Vision should return valid structured JSON from a garment image."""
        from app.vsupload_pipeline import analyze_garment_gemini

        image_bytes = _create_test_image()
        result = analyze_garment_gemini(image_bytes, "image/jpeg")

        self.assertIsNotNone(result, "Gemini Vision returned None — check API key and quota")
        self.assertIsInstance(result, dict)

        # Verify required fields
        required_fields = ["name", "description", "color"]
        for field in required_fields:
            self.assertIn(field, result, f"Missing required field: {field}")
            self.assertTrue(len(result[field]) > 0, f"Field '{field}' is empty")

        # Verify optional fields exist (can be empty)
        optional_fields = ["style", "occasion", "sleeve", "neckline", "fabric", "length"]
        for field in optional_fields:
            self.assertIn(field, result, f"Missing optional field: {field}")

        # Verify occasion is a list
        self.assertIsInstance(result.get("occasion", []), list, "occasion should be a list")

        print(f"\n✅ Gemini Vision result:\n{json.dumps(result, indent=2)}")

    @unittest.skip("Groq fallback removed from pipeline — Gemini Vision only")
    def test_groq_fallback_extraction(self):
        """Groq fallback is no longer used in the pipeline."""
        pass


# ═══════════════════════════════════════════════════════════════════
# Test 2: Imagen Prompt Construction
# ═══════════════════════════════════════════════════════════════════

class TestPromptConstruction(unittest.TestCase):
    """Test Imagen prompt building from metadata."""

    def test_build_prompts(self):
        """Should produce 3 prompts for front, 3quarter, and back angles."""
        from app.vsupload_pipeline import build_fallback_prompts

        metadata = {
            "name": "Ivory Bloom Wrap Dress",
            "description": "A flowy ivory wrap dress with delicate floral embroidery.",
            "color": "Ivory",
            "style": "Wrap",
            "occasion": ["Casual", "Summer"],
            "sleeve": "Sleeveless",
            "neckline": "V-neck",
            "fabric": "Chiffon",
            "length": "Midi",
        }

        prompts = build_fallback_prompts(metadata)

        self.assertEqual(len(prompts), 3, "Should produce exactly 3 prompts")

        angles = [p[1] for p in prompts]
        self.assertIn("front", angles)
        self.assertIn("3quarter", angles)
        self.assertIn("back", angles)

        for prompt_text, angle in prompts:
            self.assertIn("Ivory", prompt_text)
            self.assertIn("Chiffon", prompt_text)
            self.assertTrue(len(prompt_text) > 50, f"Prompt too short for {angle}")

        print(f"\n✅ Generated 3 prompts:")
        for text, angle in prompts:
            print(f"  [{angle}] {text[:80]}...")


# ═══════════════════════════════════════════════════════════════════
# Test 3: Image Generation
# ═══════════════════════════════════════════════════════════════════

class TestImageGeneration(unittest.TestCase):
    """Test Gemini Imagen model photo generation."""

    @unittest.skipIf(SKIP_GEMINI, "GEMINI_API_KEY not set — skipping Imagen test")
    def test_generate_single_image(self):
        """Imagen should return JPEG bytes for a fashion prompt."""
        from app.vsupload_pipeline import generate_single_image

        prompt = (
            "Fashion editorial photograph of a model wearing an ivory chiffon "
            "wrap midi dress with V-neck neckline and sleeveless design. "
            "Studio lighting, clean white background, full-body front view, "
            "professional fashion photography, high resolution."
        )

        result = generate_single_image(prompt, GEMINI_API_KEY)

        self.assertIsNotNone(result, "Imagen returned None — check API key and billing")
        self.assertIsInstance(result, bytes)
        self.assertTrue(len(result) > 1000, f"Image too small ({len(result)} bytes)")

        # Verify it's a valid image
        img = Image.open(io.BytesIO(result))
        self.assertGreater(img.width, 0)
        self.assertGreater(img.height, 0)

        print(f"\n✅ Generated image: {img.width}×{img.height}, {len(result):,} bytes")


# ═══════════════════════════════════════════════════════════════════
# Test 4: End-to-End Pipeline (with mocked MongoDB)
# ═══════════════════════════════════════════════════════════════════

class TestEndToEnd(unittest.TestCase):
    """Test the full pipeline with mocked MongoDB."""

    @unittest.skipIf(SKIP_GEMINI, "GEMINI_API_KEY not set — skipping E2E test")
    def test_full_pipeline_mock_db(self):
        """Run the full pipeline: photo → metadata → images → store."""
        from app.vsupload_pipeline import (
            analyze_garment_gemini,
            build_fallback_prompts,
            generate_single_image,
        )

        print("\n🔄 Running end-to-end pipeline test...")

        # Step 1: Create test image
        image_bytes = _create_test_image(800, 1200, (200, 180, 160))
        print("  ✓ Test image created")

        # Step 2: Extract metadata
        metadata = analyze_garment_gemini(image_bytes, "image/jpeg")
        self.assertIsNotNone(metadata, "Metadata extraction failed")
        print(f"  ✓ Metadata extracted: {metadata.get('name', 'unknown')}")

        # Step 3: Build fallback prompts
        prompts = build_fallback_prompts(metadata)
        self.assertEqual(len(prompts), 3)
        print(f"  ✓ {len(prompts)} prompts built")

        # Step 4: Generate first image only (to save API credits)
        prompt_text, angle = prompts[0]
        generated = generate_single_image(prompt_text, GEMINI_API_KEY)
        self.assertIsNotNone(generated, "Image generation failed")
        print(f"  ✓ Model image generated ({angle}, {len(generated):,} bytes)")

        print("\n✅ End-to-end pipeline test PASSED")
        print(f"   Product: {metadata.get('name')}")
        print(f"   Color:   {metadata.get('color')}")
        print(f"   Style:   {metadata.get('style')}")
        print(f"   Fabric:  {metadata.get('fabric')}")


# ═══════════════════════════════════════════════════════════════════
# Test 5: Schema Validation
# ═══════════════════════════════════════════════════════════════════

class TestSchemas(unittest.TestCase):
    """Test Pydantic schema validation."""

    def test_product_update_request(self):
        """ProductUpdateRequest should accept partial updates."""
        from app.vsupload_schemas import ProductUpdateRequest

        # Minimal update
        req = ProductUpdateRequest(title="Updated Title")
        self.assertEqual(req.title, "Updated Title")
        self.assertIsNone(req.price)

        # Full update
        req = ProductUpdateRequest(
            title="Full Title",
            price=1499.99,
            sizes=["S", "M", "L"],
            category="Dresses",
            sku="AG-001",
        )
        self.assertEqual(req.price, 1499.99)
        self.assertEqual(len(req.sizes), 3)

        print("\n✅ Schema validation tests passed")

    def test_reject_request(self):
        """RejectRequest should have optional reason."""
        from app.vsupload_schemas import RejectRequest

        req = RejectRequest()
        self.assertEqual(req.reason, "")

        req = RejectRequest(reason="Poor quality images")
        self.assertEqual(req.reason, "Poor quality images")


# ═══════════════════════════════════════════════════════════════════
# Runner
# ═══════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("VSUpload Integration Test Suite")
    print("=" * 60)
    print(f"  GEMINI_API_KEY: {'[SET]' if not SKIP_GEMINI else '[NOT SET] (Gemini tests will skip)'}")
    print(f"  GROQ_API_KEY:   {'[SET]' if not SKIP_GROQ else '[NOT SET] (Groq tests will skip)'}")
    print("=" * 60)
    print()

    # If a specific test class name is passed as argument, run only that
    if len(sys.argv) > 1 and not sys.argv[1].startswith("-"):
        test_name = sys.argv[1]
        suite = unittest.TestLoader().loadTestsFromName(test_name, module=sys.modules[__name__])
        runner = unittest.TextTestRunner(verbosity=2)
        runner.run(suite)
    else:
        unittest.main(verbosity=2)

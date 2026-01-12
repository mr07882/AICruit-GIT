#loader_resume.py
# Robust PDF/DOCX loader: region-based extraction for PDFs, text extraction for DOCX,
# multi-column detection with vertical alignment, OCR fallbacks.

import re
import unicodedata
import subprocess
import tempfile
from pathlib import Path
from typing import List, Tuple

# DOCX support
try:
    from docx import Document
    HAS_DOCX = True
except Exception:
    HAS_DOCX = False

# Prefer PyMuPDF; fallback to pdfplumber
try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except Exception:
    HAS_PYMUPDF = False
    import pdfplumber  # type: ignore

# Optional OCR fallback
try:
    from pdf2image import convert_from_path
    import pytesseract
    HAS_PURE_OCR = True
except Exception:
    HAS_PURE_OCR = False



# --------------------------------------------------
# Heuristics
# --------------------------------------------------
def _is_sparse(text: str, min_chars: int = 400) -> bool:
    return len((text or "").strip()) < min_chars


def _clean_text(s: str) -> str:
    s = unicodedata.normalize("NFKC", s or "")
    s = re.sub(r"(\w)-\n(\w)", r"\1\2", s)         # join hyphenation
    s = s.replace("•", "- ").replace("▪", "- ").replace("·", "- ")
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()



# --------------------------------------------------
# Metadata detection (critical for avoiding false columns)
# --------------------------------------------------
def _is_metadata_span(text: str) -> bool:
    """
    Detects if right-side block looks like metadata:
    - dates
    - locations
    - cgpa / numbers
    - short tokens (<25 chars)
    """
    t = text.strip()
    if len(t) <= 25:
        date_like = bool(re.search(r"\b(\d{4}|\d{2}[\/\-]\d{4}|\d{4}[\/\-]\d{2}|\d{2}\/\d{2})", t))
        has_digits = bool(re.search(r"\d", t))
        location_like = "," in t
        cgpa_like = "gpa" in t.lower()
        return date_like or has_digits or location_like or cgpa_like
    return False



# --------------------------------------------------
# Basic PyMuPDF fallback methods
# --------------------------------------------------
def _extract_text_reading_order_pymupdf(pdf_path: Path) -> str:
    doc = fitz.open(str(pdf_path))
    return "\n".join(p.get_text("text") for p in doc)


def _extract_text_blocks_sorted_pymupdf(pdf_path: Path) -> str:
    doc = fitz.open(str(pdf_path))
    out = []
    for page in doc:
        blocks = page.get_text("blocks")
        blocks = [b for b in blocks if isinstance(b[4], str) and b[4].strip()]
        blocks.sort(key=lambda b: (round(b[1], 1), round(b[0], 1)))
        out.append("\n".join(b[4].strip() for b in blocks))
    return "\n\n".join(out)



# --------------------------------------------------
# Region grouping (vertical segmentation)
# --------------------------------------------------
def _group_blocks_into_regions(
    blocks: List[Tuple[float, float, float, float, str]],
    page_height: float,
    y_gap_frac: float = 0.04
):
    """Group blocks into vertical regions using y gap."""
    tblocks = [(b[0], b[1], b[2], b[3], b[4])
               for b in blocks if isinstance(b[4], str) and b[4].strip()]
    if not tblocks:
        return []

    tblocks.sort(key=lambda b: b[1])
    regions = []
    current = [tblocks[0]]
    y_thresh = y_gap_frac * page_height

    for b in tblocks[1:]:
        prev = current[-1]
        gap = b[1] - prev[3]
        if gap > y_thresh:
            regions.append(current)
            current = [b]
        else:
            current.append(b)

    regions.append(current)
    return regions



# --------------------------------------------------
# Column splitting (improved with vertical alignment check)
# --------------------------------------------------
def _y_overlap(a, b):
    """Return True if two blocks vertically overlap."""
    return not (a[3] < b[1] or b[3] < a[1])


def _region_try_split_columns(region_blocks, page_width, gap_frac=0.06):
    """
    Decide if region is truly multi-column.
    Must satisfy ALL:
      - large horizontal gap
      - right side NOT primarily metadata
      - enough blocks in each column
      - VERTICAL ALIGNMENT between column pairs
    """
    tblocks = list(region_blocks)
    if len(tblocks) < 6:
        return False, tblocks, []

    # sort by x
    tblocks.sort(key=lambda b: b[0])
    xs = [b[0] for b in tblocks]
    gaps = [(xs[i+1] - xs[i], i) for i in range(len(xs)-1)]
    max_gap, idx = max(gaps, key=lambda g: g[0])
    thresh = gap_frac * page_width

    if max_gap < thresh:
        return False, tblocks, []

    # candidate split
    left = tblocks[:idx+1]
    right = tblocks[idx+1:]

    # rule: avoid metadata-only right column
    right_texts = [b[4] for b in right]
    meta_count = sum(_is_metadata_span(t) for t in right_texts)
    if meta_count >= len(right_texts) * 0.7:
        return False, tblocks, []

    # rule: require at least 2 blocks in each
    if len(left) < 2 or len(right) < 2:
        return False, tblocks, []

    # rule: require vertical alignment pairs (REAL columns)
    aligned_pairs = 0
    for lb in left:
        for rb in right:
            if _y_overlap(lb, rb):
                aligned_pairs += 1
                break

    if aligned_pairs < 2:
        return False, tblocks, []

    return True, left, right



# --------------------------------------------------
# Convert region → text
# --------------------------------------------------
def _region_to_text(region_blocks, page_width, gap_frac=0.06):
    is_multi, left, right = _region_try_split_columns(region_blocks, page_width, gap_frac=gap_frac)

    # single-column region
    if not is_multi:
        blocks = list(region_blocks)
        blocks.sort(key=lambda b: (round(b[1], 2), round(b[0], 2)))
        return "\n".join(b[4].strip() for b in blocks)

    # true multi-column region
    left.sort(key=lambda b: (round(b[1], 2), round(b[0], 2)))
    right.sort(key=lambda b: (round(b[1], 2), round(b[0], 2)))

    return (
        "\n".join(b[4].strip() for b in left)
        + "\n\n"
        + "\n".join(b[4].strip() for b in right)
    )



# --------------------------------------------------
# Region-based extraction for whole PDF
# --------------------------------------------------
def _extract_text_regions_pymupdf(pdf_path: Path, gap_frac=0.06, y_gap_frac=0.04):
    doc = fitz.open(str(pdf_path))
    page_out = []

    for page in doc:
        page_w = page.rect.width
        page_h = page.rect.height
        blocks = page.get_text("blocks")

        regions = _group_blocks_into_regions(blocks, page_h, y_gap_frac=y_gap_frac)
        region_texts = []

        for region in regions:
            rt = _region_to_text(region, page_w, gap_frac=gap_frac)
            if rt.strip():
                region_texts.append(rt)

        page_out.append("\n\n".join(region_texts))

    return "\n\n".join(page_out)



# --------------------------------------------------
# pdfplumber fallback
# --------------------------------------------------
def _extract_with_pdfplumber(pdf_path: Path) -> str:
    """Extract text using pdfplumber as fallback when PyMuPDF is not available."""
    try:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(str(pdf_path)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        return "\n\n".join(text_parts)
    except Exception as e:
        print(f"[ERROR] pdfplumber extraction failed: {e}")
        return ""


# --------------------------------------------------
# OCR routes
# --------------------------------------------------
def _has_ocrmypdf():
    try:
        subprocess.run(["ocrmypdf", "--version"], stdout=subprocess.DEVNULL,
                       stderr=subprocess.DEVNULL, check=True)
        return True
    except Exception:
        return False


def _ocr_with_ocrmypdf(src: Path):
    with tempfile.TemporaryDirectory() as td:
        out_pdf = Path(td) / "ocr.pdf"
        subprocess.run(
            ["ocrmypdf", "--skip-text", "--fast-web-view", "1", str(src), str(out_pdf)],
            check=True
        )
        if HAS_PYMUPDF:
            return _extract_text_reading_order_pymupdf(out_pdf)
        return _extract_with_pdfplumber(out_pdf)


def _ocr_pure_python(src: Path, lang="eng"):
    if not HAS_PURE_OCR:
        return ""
    pages = convert_from_path(str(src))
    return "\n\n".join(pytesseract.image_to_string(img, lang=lang) for img in pages)



# --------------------------------------------------
# Public API
# --------------------------------------------------
def load_resume(resume_path: str, ocr_lang="eng", gap_frac=0.06) -> str:
    """
    1. For DOCX: Extract text directly
    2. For PDF: Region-based splitting (handles hybrid layouts)
    3. PyMuPDF fallbacks (reading-order / block-sorted)
    4. pdfplumber fallback
    5. OCR fallbacks
    """
    try:
        file_path = Path(resume_path)

        # Handle DOCX files
        if file_path.suffix.lower() == '.docx':
            if not HAS_DOCX:
                raise Exception("python-docx not available for DOCX processing")
            doc = Document(file_path)
            txt = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return _clean_text(txt)

        # Handle PDF files
        pdf_path = file_path

        if HAS_PYMUPDF:
            txt = _extract_text_regions_pymupdf(pdf_path, gap_frac=gap_frac)

            if _is_sparse(txt):
                alt1 = _extract_text_reading_order_pymupdf(pdf_path)
                alt2 = _extract_text_blocks_sorted_pymupdf(pdf_path)
                txt = max([txt, alt1, alt2], key=lambda s: len(s or ""))
        else:
            txt = _extract_with_pdfplumber(pdf_path)

        if _is_sparse(txt) and _has_ocrmypdf():
            try:
                txt = _ocr_with_ocrmypdf(pdf_path)
            except:
                pass

        if _is_sparse(txt) and HAS_PURE_OCR:
            try:
                txt = _ocr_pure_python(pdf_path, lang=ocr_lang)
            except:
                pass

        return _clean_text(txt)

    except Exception as e:
        print(f"[ERROR] Could not load resume: {resume_path}")
        print(e)
        return ""

import os
from . import config


def main():
    import logging
    logger = logging.getLogger(__name__)

    # Flag to skip already processed files
    skip_existing = config.SKIP_EXISTING

    # Directories for input and output
    resumes_folder = config.RESUME_RAW_FOLDER
    out_resumes = config.RESUME_PARSED_OUTPUT

    # Create output directory if it doesn't exist
    os.makedirs(out_resumes, exist_ok=True)

    # Process resumes and save as .txt files
    for file in os.listdir(resumes_folder):
        if file.lower().endswith(".pdf"):
            base = os.path.splitext(file)[0]
            dst_path = os.path.join(out_resumes, f"{base}.txt")

            # Skip if the file already exists
            if skip_existing and os.path.exists(dst_path):
                logger.info("Skipping existing resume: %s", file)
                continue

            # Process and save resume
            src_path = os.path.join(resumes_folder, file)
            text = load_resume(src_path)  # Load the resume using load_resume function
            with open(dst_path, "w", encoding="utf-8") as f:
                f.write(text or "")
            logger.info("Saved parsed resume: %s", file)

    logger.info("Finished processing resumes.")


if __name__ == "__main__":
    main()

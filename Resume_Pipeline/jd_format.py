import os
import json
from . import config

INPUT_FOLDER = config.JD_SEGMENTED_FOLDER
OUTPUT_FOLDER = config.JD_SEGMENTED_JSON_FOLDER
SKIP_EXISTING = config.SKIP_EXISTING

# Ensure output folder exists
if not os.path.exists(OUTPUT_FOLDER):
    os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# -----------------------------
# FUNCTION: Format and parse the segmented job description text into JSON
# -----------------------------
def format_job_description_text(segmented_text: str) -> dict:
    """Parse segmented JD text into structured JSON.

    Expected input contains headings like:
      Non-Negotiable Requirements:
      1. Requirement A
      2. Requirement B

    This function extracts lists and normalizes bullets/numbering.
    """
    import re

    formatted_data = {
        "Non-Negotiable Requirements": [],
        "Negotiable Requirements": [],
    }

    # Normalize line endings and ensure we have section headers on their own lines
    text = segmented_text.replace('\r\n', '\n')

    # Find sections by header regex
    headers = re.finditer(r"(?im)^(Non[- ]Negotiable Requirements:|Negotiable Requirements:)\s*$", text, flags=re.M)
    spans = []
    for m in headers:
        spans.append((m.start(), m.group(1).strip()))

    # If no explicit headers, attempt to split by double-newline blocks and heuristically assign
    if not spans:
        blocks = [b.strip() for b in re.split(r"\n\s*\n", text) if b.strip()]
        for b in blocks:
            if b.lower().startswith("non"):
                formatted_data["Non-Negotiable Requirements"] += _parse_requirement_block(b)
            elif b.lower().startswith("negotiable") or b.lower().startswith("nice"):
                formatted_data["Negotiable Requirements"] += _parse_requirement_block(b)
        return formatted_data

    # Build sections from headers
    sections = {}
    for idx, (pos, header) in enumerate(spans):
        start = pos
        end = spans[idx + 1][0] if idx + 1 < len(spans) else len(text)
        sections[header] = text[start:end].strip()

    # Parse each section block into list items
    for header, block in sections.items():
        key = "Non-Negotiable Requirements" if header.lower().startswith("non") else "Negotiable Requirements"
        formatted_data[key] = _parse_requirement_block(block)

    return formatted_data


def _parse_requirement_block(block: str):
    """Return a list of requirement strings from a block containing a header and items."""
    import re
    lines = [l.strip() for l in block.splitlines()]
    items = []
    # skip the header line
    if lines and re.match(r"(?i)^(Non[- ]Negotiable Requirements:|Negotiable Requirements:)", lines[0]):
        lines = lines[1:]

    for line in lines:
        if not line:
            continue
        # numbered list
        m = re.match(r"^\s*\d+\.\s*(.*)", line)
        if m:
            items.append(m.group(1).strip())
            continue
        # bullet markers
        m = re.match(r"^\s*[-•▪*]\s*(.*)", line)
        if m:
            items.append(m.group(1).strip())
            continue
        # plain lines, split by ';' or '|' if multiple
        parts = re.split(r";|\||, (?=[A-Za-z])", line)
        for p in parts:
            p = p.strip()
            if p:
                items.append(p)

    # deduplicate while preserving order
    seen = set()
    out = []
    for it in items:
        if it.lower() not in seen:
            seen.add(it.lower())
            out.append(it)
    return out

# -----------------------------
# FUNCTION: Process and format each file
# -----------------------------
def process_file(fname):
    # Output path as .json
    output_json_path = os.path.join(OUTPUT_FOLDER, fname.replace(".txt", ".json"))
    import logging
    logger = logging.getLogger(__name__)

    if SKIP_EXISTING and os.path.exists(output_json_path):
        logger.info("Skipping %s, already formatted.", fname)
        return  # Skip processing this file if it already exists

    # Read the segmented text from the file
    input_file_path = os.path.join(INPUT_FOLDER, fname)
    with open(input_file_path, "r", encoding="utf-8") as f:
        segmented_text = f.read()

    # Format the segmented text into JSON
    formatted_data = format_job_description_text(segmented_text)

    # Write the formatted data to a JSON file
    with open(output_json_path, "w", encoding="utf-8") as json_file:
        json.dump(formatted_data, json_file, indent=4, ensure_ascii=False)

    logger.info("Formatted and saved %s as JSON.", fname)

# -----------------------------
# MAIN EXECUTION
# -----------------------------
def main():
    # Get all files from the input folder
    files = [f for f in os.listdir(INPUT_FOLDER) if f.endswith(".txt")]

    # Process each file
    for fname in files:
        process_file(fname)

    print("Done. Segmented job descriptions saved in JSON format in:", OUTPUT_FOLDER)

if __name__ == "__main__":
    main()

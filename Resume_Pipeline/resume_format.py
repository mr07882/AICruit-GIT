#format.py
# Resume segmentation formatting: converting segmented text into structured JSON.

import os
import json
from . import config

INPUT_FOLDER = config.RESUME_SEGMENTED_FOLDER
OUTPUT_FOLDER = config.RESUME_SEGMENTED_JSON_FOLDER
SKIP_EXISTING = config.SKIP_EXISTING

# Ensure output folder exists
if not os.path.exists(OUTPUT_FOLDER):
    os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# -----------------------------
# FUNCTION: Format and parse segmented resume text
# -----------------------------
def format_resume_text(segmented_text: str) -> dict:
    """Parse segmented resume text into structured JSON.

    The input is expected to contain labeled sections like:
      Personal Information
      Education
      Experience
      Skills
      Projects
      Certifications
      Other Information

    This function extracts each section and applies lightweight heuristics to
    produce structured fields (lists, dictionaries) where possible.
    """
    import re

    # Normalize and ensure consistent line separators
    text = segmented_text.replace('\r\n', '\n')

    # Known section headings (case-insensitive)
    headings = [
        "Personal Information",
        "Education",
        "Experience",
        "Skills/programming Languages",
        "Projects",
        "Certifications/Courses",
        "Other Information",
    ]

    # Find positions of headings, allowing optional numbering like "1. "
    pattern = r"(?im)^(?:\d+\.\s*)?(%s)\s*$" % "|".join(re.escape(h) for h in headings)
    matches = list(re.finditer(pattern, text, flags=re.M))

    sections = {}
    if not matches:
        # fallback: treat whole text as Other Information
        sections["Other Information"] = text.strip()
    else:
        for i, m in enumerate(matches):
            start = m.end()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            heading = m.group(1).strip()
            body = text[start:end].strip()
            sections[heading] = body

    # Helpers
    def _lines_to_list(block: str):
        lines = [l.strip() for l in block.splitlines() if l.strip()]
        items = []
        for line in lines:
            # numbered
            m = re.match(r"^\s*\d+\.\s*(.*)", line)
            if m:
                items.append(m.group(1).strip())
                continue
            m = re.match(r"^\s*[-•▪*]\s*(.*)", line)
            if m:
                items.append(m.group(1).strip())
                continue
            # comma separated
            if "," in line and len(line) < 120:
                parts = [p.strip() for p in re.split(r",\s*", line) if p.strip()]
                items.extend(parts)
            else:
                items.append(line)
        # dedupe preserve order
        out = []
        seen = set()
        for it in items:
            key = it.lower()
            if key not in seen:
                seen.add(key)
                out.append(it)
        return out

    def _split_entries(block: str):
        # split on blank lines into entries
        parts = [p.strip() for p in re.split(r"\n\s*\n", block) if p.strip()]
        return parts

    def _parse_education(block: str):
        entries = _split_entries(block)
        out = []
        for e in entries:
            lines = [l.strip() for l in e.splitlines() if l.strip()]
            entry = {"raw": e}
            # try to extract year or range
            yr = re.search(r"(\d{4}(?:\s*[–-]\s*\d{4})?)", e)
            if yr:
                entry["years"] = yr.group(1)
            # try degree and institution heuristics
            if lines:
                entry["title"] = lines[0]
                if len(lines) > 1:
                    entry["details"] = " ".join(lines[1:])
            out.append(entry)
        return out

    def _parse_experience(block: str):
        entries = _split_entries(block)
        out = []
        for e in entries:
            lines = [l.strip() for l in e.splitlines() if l.strip()]
            obj = {"raw": e}
            if lines:
                obj["headline"] = lines[0]
                bullets = []
                for l in lines[1:]:
                    m = re.match(r"^\s*[-•▪*\d\.]+\s*(.*)", l)
                    if m:
                        bullets.append(m.group(1).strip())
                    else:
                        bullets.append(l)
                if bullets:
                    obj["highlights"] = bullets
            out.append(obj)
        return out

    def _parse_skills(block: str):
        items = _lines_to_list(block)
        skills = []
        for it in items:
            parts = [s.strip() for s in re.split(r"[,;/]|\|", it) if s.strip()]
            skills.extend(parts)
        # dedupe
        seen = set(); out = []
        for s in skills:
            k = s.lower()
            if k not in seen:
                seen.add(k); out.append(s)
        return out

    def _parse_projects(block: str):
        entries = _split_entries(block)
        out = []
        for e in entries:
            lines = [l.strip() for l in e.splitlines() if l.strip()]
            obj = {"raw": e}
            if lines:
                obj["title"] = lines[0]
                descriptions = []
                for l in lines[1:]:
                    m = re.match(r"^\s*[-•▪*\d\.]+\s*(.*)", l)
                    if m:
                        descriptions.append(m.group(1).strip())
                    else:
                        descriptions.append(l)
                if descriptions:
                    obj["description"] = descriptions
            out.append(obj)
        return out

    def _parse_certifications(block: str):
        return _lines_to_list(block)

    def _parse_section_with_subheadings(block: str):
        lines = [l.strip() for l in block.splitlines() if l.strip()]
        sections = {}
        current_heading = None
        for line in lines:
            if line.startswith('•'):
                # Remove bullet and set as heading
                current_heading = re.sub(r"^\s*•\s*", "", line)
                sections[current_heading] = []
            elif current_heading and line.startswith('–'):
                # Remove sub-bullet and add to current heading
                cleaned = re.sub(r"^\s*–\s*", "", line)
                sections[current_heading].append(cleaned)
            elif current_heading and line.strip() and not line.startswith(('•', '–')):
                # If not bullet, perhaps add to current or something, but for now, ignore or add
                pass
        # If no subheadings detected, return as list
        if not sections:
            return [re.sub(r"^\s*[-•▪*–]+\s*", "", line) for line in lines if line.strip()]
        return sections

    # Build formatted data
    formatted = {}
    # Personal Information
    pi = sections.get("Personal Information", "")
    if pi:
        # parse lines with key: value
        info = {}
        for ln in [l for l in pi.splitlines() if l.strip()]:
            if ":" in ln:
                k, v = ln.split(":", 1)
                info[k.strip()] = v.strip()
            else:
                # fallback to store as contact lines
                info.setdefault("lines", []).append(ln.strip())
        formatted["Personal Information"] = info
    else:
        formatted["Personal Information"] = {}

    formatted["Education"] = _lines_to_list(sections.get("Education", ""))
    formatted["Experience"] = _lines_to_list(sections.get("Experience", ""))
    formatted["Skills"] = _lines_to_list(sections.get("Skills/programming Languages", ""))
    formatted["Projects"] = _lines_to_list(sections.get("Projects", ""))
    formatted["Certifications"] = _lines_to_list(sections.get("Certifications/Courses", ""))
    formatted["Other Information"] = _lines_to_list(sections.get("Other Information", ""))

    return formatted

# -----------------------------
# FUNCTION: Process and format each file
# -----------------------------
def process_file(fname):
    import logging
    logger = logging.getLogger(__name__)

    # Check if the corresponding output file already exists
    output_json_path = os.path.join(OUTPUT_FOLDER, fname.replace(".txt", ".json"))
    if SKIP_EXISTING and os.path.exists(output_json_path):
        logger.info("Skipping %s, already segmented.", fname)
        return  # Skip processing this file if it already exists

    # Read the segmented text from the file
    input_file_path = os.path.join(INPUT_FOLDER, fname)
    with open(input_file_path, "r", encoding="utf-8") as f:
        segmented_text = f.read()

    # Format the segmented text into JSON
    formatted_data = format_resume_text(segmented_text)

    # Write the formatted data to a JSON file
    with open(output_json_path, "w", encoding="utf-8") as json_file:
        json.dump(formatted_data, json_file, indent=4, ensure_ascii=False)

    logger.info("Formatted and saved %s as JSON.", fname)

# -----------------------------
# MAIN EXECUTION
# -----------------------------
def main():
    # Get all files from the segmented folder
    files = [f for f in os.listdir(INPUT_FOLDER) if f.endswith(".txt")]

    # Process each file
    for fname in files:
        process_file(fname)

    print("Done. Segmented resumes saved in JSON format in:", OUTPUT_FOLDER)

if __name__ == "__main__":
    main()

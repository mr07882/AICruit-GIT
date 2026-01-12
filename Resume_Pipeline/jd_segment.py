#jd_segmentation/segment.py
# Job description segmentation using Azure OpenAI: separating negotiable and non-negotiable requirements.

import os
import json
from . import config

# -----------------------------
# CONFIG (from finalCode.config)
# -----------------------------
INPUT_FOLDER = config.JD_INPUT_FOLDER
OUTPUT_FOLDER = config.JD_SEGMENTED_FOLDER
SKIP_EXISTING = config.SKIP_EXISTING
DEPLOYMENT_NAME = config.DEPLOYMENT_NAME

# Note: client initialization happens lazily inside call helpers to avoid
# requiring OPENAI_API_KEY at import time (supports dry-run/testing).

# -----------------------------
# SEGMENTATION PROMPT
# -----------------------------
SEGMENTATION_SYSTEM_PROMPT = (
    "You will segment the job description into two categories: "
    "'Non-Negotiable Requirements' and 'Negotiable Requirements'. "
    "Non-Negotiable Requirements are the must-have qualifications, skills, or experiences, "
    "while Negotiable Requirements are the desired or optional qualifications, skills, or experiences.\n\n"
    "Output strictly in the following format:\n\n"
    "Non-Negotiable Requirements:\n"
    "1. [Requirement 1]\n"
    "2. [Requirement 2]\n\n"
    "Negotiable Requirements:\n"
    "1. [Requirement 1]\n"
    "2. [Requirement 2]\n\n"
    "Ensure that each requirement is listed separately, and if a category has no requirements, return it as an empty list."
)

# -----------------------------
# FUNCTION: segment job description
# -----------------------------
def segment_job_description(text: str, dry_run: bool = False) -> str:
    """Segment a job description. If dry_run=True, use heuristics and avoid API calls."""
    if dry_run:
        # Simple heuristic: extract Must-Have / Nice-to-Have sections if present
        lowered = text.lower()
        must = []
        nice = []
        import re

        m = re.search(r"must[- ]?have:(.*?)(?:nice[- ]?to[- ]?have:|$)", text, flags=re.IGNORECASE | re.S)
        if m:
            must_text = m.group(1).strip()
            must = [line.strip() for line in must_text.splitlines() if line.strip()]
        else:
            # fallback: look for Requirements section
            m2 = re.search(r"requirements(.*)", text, flags=re.IGNORECASE | re.S)
            if m2:
                must = [line.strip() for line in m2.group(1).splitlines() if line.strip()]

        n = re.search(r"nice[- ]?to[- ]?have:(.*)", text, flags=re.IGNORECASE | re.S)
        if n:
            nice_text = n.group(1).strip()
            nice = [line.strip() for line in nice_text.splitlines() if line.strip()]

        out_lines = ["Non-Negotiable Requirements:"]
        if must:
            for i, it in enumerate(must, 1):
                out_lines.append(f"{i}. {it}")
        else:
            out_lines.append("(none)")

        out_lines.append("\nNegotiable Requirements:")
        if nice:
            for i, it in enumerate(nice, 1):
                out_lines.append(f"{i}. {it}")
        else:
            out_lines.append("(none)")

        return "\n".join(out_lines)
    messages = [
        {"role": "system", "content": SEGMENTATION_SYSTEM_PROMPT},
        {"role": "user", "content": text},
    ]

    from .openai_client import call_chat_completions

    response = call_chat_completions(messages, model=DEPLOYMENT_NAME)
    return response.choices[0].message.content

# -----------------------------
# FUNCTION to process and segment each file
# -----------------------------
def process_file(fname):
    out_path = os.path.join(OUTPUT_FOLDER, fname)
    if SKIP_EXISTING and os.path.exists(out_path):
        import logging
        logging.getLogger(__name__).info("Skipping %s, already segmented.", fname)
        return

    input_file_path = os.path.join(INPUT_FOLDER, fname)
    with open(input_file_path, "r", encoding="utf-8") as f:
        job_desc_text = f.read()

    segmented = segment_job_description(job_desc_text)

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(segmented)

    import logging
    logging.getLogger(__name__).info("Formatted and saved %s as text.", fname)

# -----------------------------
# MAIN EXECUTION
# -----------------------------
def main():
    if not os.path.exists(OUTPUT_FOLDER):
        os.makedirs(OUTPUT_FOLDER, exist_ok=True)

    files = [f for f in os.listdir(INPUT_FOLDER) if f.endswith(".txt")]
    for fname in files:
        process_file(fname)
    print("Done. Segmented job descriptions saved in:", OUTPUT_FOLDER)


if __name__ == "__main__":
    main()

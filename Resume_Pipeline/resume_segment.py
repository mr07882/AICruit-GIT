#segment.py
# Resume segmentation using Azure OpenAI: structured sections extraction,


import os
import concurrent.futures
from . import config

# ----------------------------- CONFIG -----------------------------
INPUT_FOLDER = config.RESUME_PARSED_FOLDER
OUTPUT_FOLDER = config.RESUME_SEGMENTED_FOLDER
SKIP_EXISTING = config.SKIP_EXISTING
DEPLOYMENT_NAME = config.DEPLOYMENT_NAME

# Note: client initialization is lazy inside call helper to avoid requiring
# OPENAI_API_KEY at import time (supports dry-run/testing).

# ----------------------------- SEGMENTATION PROMPT -----------------------------
SEGMENTATION_SYSTEM_PROMPT = (
    "You will clean and segment resumes into structured sections. "
    "Output strictly in this order:\n\n"
    "1. Personal Information\n\n"
    "2. Education\n\n"
    "3. Experience\n\n"
    "4. Skills/programming Languages\n\n"
    "5. Projects\n\n"
    "6. Certifications/Courses\n\n"
    "7. Other Information\n\n"
    "Ensure sections exist even if empty. Remove noise, duplicates, headers, footers."
)

# ----------------------------- FUNCTION: segment a resume -----------------------------
def segment_resume(text: str, dry_run: bool = False) -> str:
    """Segment a resume. If dry_run=True, avoid API calls and return a simple structured segmentation."""
    if dry_run:
        # Create structured section headers and place full text under Other Information
        sections = [
            "Personal Information",
            "Education",
            "Experience",
            "Skills/programming Languages",
            "Projects",
            "Certifications/Courses",
            "Other Information",
        ]
        out = []
        for s in sections[:-1]:
            out.append(s)
            out.append("")
        out.append("Other Information")
        out.append(text or "")
        return "\n".join(out)

    from .openai_client import call_chat_completions

    messages = [
        {"role": "system", "content": SEGMENTATION_SYSTEM_PROMPT},
        {"role": "user", "content": text},
    ]

    response = call_chat_completions(messages, model=DEPLOYMENT_NAME)
    return response.choices[0].message.content

# ----------------------------- MAIN -----------------------------
def process_file(fname):
    out_path = os.path.join(OUTPUT_FOLDER, fname)
    if SKIP_EXISTING and os.path.exists(out_path):
        import logging
        logging.getLogger(__name__).info("Skipping %s, already segmented.", fname)
        return

    path = os.path.join(INPUT_FOLDER, fname)
    with open(path, "r", encoding="utf-8") as f:
        raw_text = f.read()

    import logging
    logging.getLogger(__name__).info("Processing: %s", fname)
    segmented = segment_resume(raw_text)

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(segmented)
    logging.getLogger(__name__).info("Saved segmented resume: %s", fname)

# ----------------------------- MAIN EXECUTION -----------------------------
def main():
    if not os.path.exists(OUTPUT_FOLDER):
        os.makedirs(OUTPUT_FOLDER)

    files = [f for f in os.listdir(INPUT_FOLDER) if f.endswith(".txt")]

    # Use ThreadPoolExecutor to run the segmenting process concurrently
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        executor.map(process_file, files)

    print("Done. Segmented resumes saved in:", OUTPUT_FOLDER)

if __name__ == "__main__":
    main()

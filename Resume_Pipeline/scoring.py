import os
import concurrent.futures
import json
from . import config

# ----------------------------- CONFIG -----------------------------
RESUME_FOLDER = config.RESUME_SEGMENTED_JSON_FOLDER
JD_FILE = os.environ.get(
    "SCORING_JD_FILE",
    os.path.join(config.JD_SEGMENTED_JSON_FOLDER, "jd2.json"),
)
OUTPUT_FOLDER = config.SCORING_OUTPUT_FOLDER
SKIP_EXISTING = config.SKIP_EXISTING
DEPLOYMENT_NAME = config.DEPLOYMENT_NAME

# Note: client initialization is lazy inside call helper to avoid requiring
# OPENAI_API_KEY at import time (supports dry-run/testing).

# ----------------------------- EVALUATION PROMPT -----------------------------
EVALUATION_SYSTEM_PROMPT = (
    "You are a recruiter evaluating a candidate's resume based on a job description. "
    "Evaluate the candidate's fit for the role based on the following criteria:\n\n"
    "1. Fulfillment with Non-Negotiable Criteria in the Job Description (JD)\n"
    "2. Fulfillment with Negotiable Criteria in the Job Description (JD)\n"
    "3. Continuity and Recency of Experience with both Non-Negotiable and Negotiable Criteria in JD\n\n"
    "For each of these criteria, assign a score out of 10 and provide a two-line justification for the score given.\n\n")


# ----------------------------- FUNCTION: parse evaluation text into structured JSON -----------------------------
def parse_evaluation(evaluation_text: str) -> dict:
    import re
    sections = evaluation_text.split('\n\n')
    parsed = {}
    for section in sections:
        section = section.strip()
        if section:
            # Match pattern: "1. Title: 10/10\n   description line 1\n   description line 2"
            match = re.match(r'(\d+)\.\s*(.+?):\s*(\d+/10)\s*\n(.+)', section, re.DOTALL)
            if match:
                num, title, score, desc = match.groups()
                parsed[title.strip()] = {
                    "score": score.strip(),
                    "description": desc.strip()
                }
    return parsed

# ----------------------------- FUNCTION: evaluate resume against JD -----------------------------
def evaluate_resume(resume_text: str, jd_text: str) -> dict:
    try:
        from .openai_client import call_chat_completions

        messages = [
            {"role": "system", "content": EVALUATION_SYSTEM_PROMPT},
            {"role": "user", "content": f"Resume: {resume_text}\nJob Description: {jd_text}"},
        ]

        print(f"[DEBUG] Calling OpenAI for evaluation...")
        response = call_chat_completions(messages, model=DEPLOYMENT_NAME)
        evaluation_result = response.choices[0].message.content
        print(f"[DEBUG] AI Response: {evaluation_result[:500]}...")

        parsed = parse_evaluation(evaluation_result)
        print(f"[DEBUG] Parsed evaluation: {parsed}")

        if not parsed:
            print(f"[WARNING] parse_evaluation returned empty! Full AI response: {evaluation_result}")

        return parsed
    except Exception as e:
        print(f"[ERROR] Error in evaluating resume: {e}")
        import traceback
        traceback.print_exc()
        return {}  # Return empty dict in case of error

# ----------------------------- FUNCTION: process each resume and evaluate -----------------------------
def process_file(fname, jd_text):
    # Output path for the evaluated resume
    out_path = os.path.join(OUTPUT_FOLDER, fname)
    
    import logging
    logger = logging.getLogger(__name__)

    if SKIP_EXISTING and os.path.exists(out_path):
        logger.info("Skipping %s, already evaluated.", fname)
        return

    # Read resume from the resume folder (JSON format)
    resume_path = os.path.join(RESUME_FOLDER, fname)
    try:
        with open(resume_path, "r", encoding="utf-8") as f:
            resume_data = json.load(f)
            resume_text = json.dumps(resume_data, indent=4)
    except Exception as e:
        print(f"Error reading resume {fname}: {e}")
        return

    logger.info("Evaluating: %s", fname)
    evaluation = evaluate_resume(resume_text, jd_text)
    print(f"EVALUATION RESULT FOR {fname}:")
    print(repr(evaluation))
    print("END EVALUATION RESULT")

    if not evaluation:
        logger.warning("No evaluation result for %s", fname)
        return

    logger.info("Parsed evaluation: %s", evaluation)
    logger.info("Saving evaluation for: %s", fname)

    try:
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(evaluation, f, indent=4)
    except Exception as e:
        print(f"Error saving evaluation for {fname}: {e}")

# ----------------------------- MAIN EXECUTION -----------------------------
def main():
    if not os.path.exists(OUTPUT_FOLDER):
        os.makedirs(OUTPUT_FOLDER)

    # Read the JD file once
    try:
        with open(JD_FILE, "r", encoding="utf-8") as f:
            jd_data = json.load(f)
            jd_text = json.dumps(jd_data, indent=4)
    except Exception as e:
        print(f"Error reading JD file: {e}")
        return

    # Process each resume in the resume folder
    files = [f for f in os.listdir(RESUME_FOLDER) if f.endswith(".json")]

    if not files:
        print("No resume files found in the directory.")
        return

    # Use ThreadPoolExecutor to run the evaluation process concurrently
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        # Passing the JD text to be used for all resumes
        executor.map(lambda fname: process_file(fname, jd_text), files)

    print("Done. Evaluated resumes saved in:", OUTPUT_FOLDER)

if __name__ == "__main__":
    main()

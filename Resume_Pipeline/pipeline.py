"""Orchestrator pipeline to process raw resumes and JDs end-to-end.

Steps (preserves existing logic and outputs):
  - JD: segment -> save segmented .txt -> format -> save .json
  - Resumes: parse PDFs -> save parsed .txt -> segment -> save segmented .txt -> format -> save .json
  - Scoring: evaluate each resume JSON against a chosen JD JSON -> save evaluation JSON

Run with: python -m finalCode.pipeline (from repository root)
"""
import os
import json
import argparse
from glob import glob
from . import config
from . import loader_resume
from . import resume_segment
from . import resume_format
from . import jd_segment
from . import jd_format
from .scoring import evaluate_resume, parse_evaluation
from .logging_util import setup_logging
import logging


def ensure_dirs():
    for p in (
        config.JD_INPUT_FOLDER,
        config.JD_SEGMENTED_FOLDER,
        config.JD_SEGMENTED_JSON_FOLDER,
        config.RESUME_RAW_FOLDER,
        config.RESUME_PARSED_OUTPUT,
        config.RESUME_SEGMENTED_FOLDER,
        config.RESUME_SEGMENTED_JSON_FOLDER,
        config.SCORING_OUTPUT_FOLDER,
    ):
        os.makedirs(p, exist_ok=True)


def process_jds(dry_run: bool = False):
    logger = logging.getLogger(__name__)
    logger.info("Processing JDs...")
    txt_files = [f for f in os.listdir(config.JD_INPUT_FOLDER) if f.endswith(".txt")]
    for fname in txt_files:
        src = os.path.join(config.JD_INPUT_FOLDER, fname)
        with open(src, "r", encoding="utf-8") as f:
            text = f.read()

        segmented = jd_segment.segment_job_description(text, dry_run=dry_run)
        seg_path = os.path.join(config.JD_SEGMENTED_FOLDER, fname)
        with open(seg_path, "w", encoding="utf-8") as f:
            f.write(segmented)

        formatted = jd_format.format_job_description_text(segmented)
        json_name = fname.replace(".txt", ".json")
        json_path = os.path.join(config.JD_SEGMENTED_JSON_FOLDER, json_name)
        with open(json_path, "w", encoding="utf-8") as jf:
            json.dump(formatted, jf, indent=4, ensure_ascii=False)

        logger.info("JD processed: %s", fname)


def process_resumes(dry_run: bool = False):
    logger = logging.getLogger(__name__)
    logger.info("Processing resumes (PDF -> parsed text -> segmented -> json)...")

    # Parse PDFs to text
    pdfs = [f for f in os.listdir(config.RESUME_RAW_FOLDER) if f.lower().endswith(".pdf")]
    for pdf in pdfs:
        src_pdf = os.path.join(config.RESUME_RAW_FOLDER, pdf)
        parsed_text = loader_resume.load_resume(src_pdf)
        out_name = os.path.splitext(pdf)[0] + ".txt"
        out_path = os.path.join(config.RESUME_PARSED_OUTPUT, out_name)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(parsed_text or "")
        logger.info("Parsed resume: %s -> %s", pdf, out_name)

    # Segment parsed resumes
    parsed_txts = [f for f in os.listdir(config.RESUME_PARSED_OUTPUT) if f.endswith(".txt")]
    for fname in parsed_txts:
        path = os.path.join(config.RESUME_PARSED_OUTPUT, fname)
        with open(path, "r", encoding="utf-8") as f:
            txt = f.read()

        segmented = resume_segment.segment_resume(txt, dry_run=dry_run)
        seg_path = os.path.join(config.RESUME_SEGMENTED_FOLDER, fname)
        with open(seg_path, "w", encoding="utf-8") as f:
            f.write(segmented)

        formatted = resume_format.format_resume_text(segmented)
        json_name = fname.replace(".txt", ".json")
        json_path = os.path.join(config.RESUME_SEGMENTED_JSON_FOLDER, json_name)
        with open(json_path, "w", encoding="utf-8") as jf:
            json.dump(formatted, jf, indent=4, ensure_ascii=False)

        logger.info("Resume segmented & formatted: %s", fname)


def select_jd_json():
    # Allow override via env var; otherwise pick first JD json in folder
    env = os.environ.get("PIPELINE_JD_JSON")
    if env and os.path.exists(env):
        return env

    files = [f for f in os.listdir(config.JD_SEGMENTED_JSON_FOLDER) if f.endswith(".json")]
    if not files:
        raise RuntimeError("No JD JSON files found in " + config.JD_SEGMENTED_JSON_FOLDER)
    return os.path.join(config.JD_SEGMENTED_JSON_FOLDER, files[0])


def scoring_step(dry_run=False):
    if dry_run:
        print("Skipping scoring in dry-run mode.")
        return
        
    print("Scoring resumes against JD...")
    jd_json_path = select_jd_json()
    with open(jd_json_path, "r", encoding="utf-8") as jf:
        jd_data = json.load(jf)
    jd_text = json.dumps(jd_data, indent=4)

    resume_jsons = [f for f in os.listdir(config.RESUME_SEGMENTED_JSON_FOLDER) if f.endswith(".json")]
    for fname in resume_jsons:
        resume_path = os.path.join(config.RESUME_SEGMENTED_JSON_FOLDER, fname)
        with open(resume_path, "r", encoding="utf-8") as rf:
            resume_data = json.load(rf)
        resume_text = json.dumps(resume_data, indent=4)

        raw_evaluation = evaluate_resume(resume_text, jd_text)
        evaluation = raw_evaluation  # Already parsed in evaluate_resume
        out = {"resume_filename": fname, "evaluation": evaluation}
        out_path = os.path.join(config.SCORING_OUTPUT_FOLDER, fname)
        with open(out_path, "w", encoding="utf-8") as of:
            json.dump(out, of, indent=4)
        print(f"Saved evaluation for: {fname}")


def main():
    parser = argparse.ArgumentParser(description="Run the resume+JD pipeline end-to-end")
    parser.add_argument("--dry-run", action="store_true", help="Do not call model APIs; run local steps only")
    parser.add_argument("--jd-json", type=str, help="Path to JD JSON for scoring (overrides auto selection)")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    args = parser.parse_args()

    setup_logging(args.verbose)
    logger = logging.getLogger(__name__)

    ensure_dirs()

    if args.dry_run:
        logger.info("Dry-run: JD segmentation and resume parsing will run where possible, but model calls are skipped.")

    process_jds(args.dry_run)
    process_resumes(args.dry_run)

    if args.jd_json:
        os.environ["PIPELINE_JD_JSON"] = args.jd_json

    scoring_step(args.dry_run)
    logger.info("Pipeline finished. Outputs saved at each step.")


if __name__ == "__main__":
    main()

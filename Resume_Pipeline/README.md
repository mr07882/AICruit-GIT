# finalCode pipeline

This package contains utilities and scripts used to parse, segment and score resumes against job descriptions using an OpenAI/Azure OpenAI model.

## Overview
- `loader_resume.py` — load and extract text from PDF/DOCX resumes (PyMuPDF, pdfplumber, OCR fallbacks).
- `resume_segment.py` — call the model to segment resume text into sections.
- `resume_format.py` — convert segmented resume text to JSON.
- `jd_segment.py` — call the model to segment job descriptions into Non-Negotiable and Negotiable sections.
- `jd_format.py` — convert segmented JD text to JSON.
- `scoring.py` — evaluate segmented resume JSON against a JD JSON using the model.
- `pipeline.py` — orchestrator to run the full flow end-to-end.
- `api_server.py` — FastAPI server for backend integration.

## Setup
1. Create a Python 3.8+ virtual environment and activate it.
2. Install requirements:
```powershell
python -m pip install -r finalCode\requirements.txt
```
3. Set environment variables (required):
- `OPENAI_API_KEY` (or `AZURE_OPENAI_KEY`)
Optional:
- `OPENAI_ENDPOINT`, `DEPLOYMENT_NAME`, and path overrides used by `finalCode/config.py`.

## Running as CLI Pipeline
From the repository root:
```powershell
python -m finalCode.pipeline
```

### Pipeline CLI Options
- `--dry-run` : run pipeline without calling the model (useful for testing).
- `--jd-json <path>` : use a specific JD JSON for scoring.
- `--verbose` : enable verbose logging.

## Running as API Server
Start the FastAPI server for backend integration:
```powershell
python -m finalCode.api_server
```

The server runs on http://localhost:8000. See `API_README.md` for detailed API documentation.

### API Endpoints
- `POST /segment-jd` — Segment raw JD text into JSON
- `POST /evaluate-resume` — Evaluate resume against JD (downloads from Cloudinary)
- `GET /health` — Health check

## Notes
- Secrets must be set via environment variables; code will raise if none provided.
- For OCR, install the Tesseract engine and `ocrmypdf` in system PATH if you need OCR fallbacks.
- The API server supports both PDF and DOCX resume formats.

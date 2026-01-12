"""
API Server for Resume-JD Processing
Provides endpoints for JD segmentation and resume evaluation
"""

import os
import tempfile
import requests
from pathlib import Path
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import uvicorn
import argparse

# Import existing processing modules
from . import config
from .jd_segment import segment_job_description
from .jd_format import format_job_description_text
from .loader_resume import load_resume
from .resume_segment import segment_resume
from .resume_format import format_resume_text
from .scoring import evaluate_resume

app = FastAPI(title="AI Recruit API", description="API for processing job descriptions and resumes", version="1.0.0")

# Pydantic models for request/response
class JDSegmentationRequest(BaseModel):
    jd_text: str

class JDSegmentationResponse(BaseModel):
    segmented_jd: Dict[str, List[str]]

class ResumeEvaluationRequest(BaseModel):
    resume_url: str  # Cloudinary URL
    jd_json: Dict[str, Any]  # Segmented JD JSON

class ResumeEvaluationResponse(BaseModel):
    evaluation: Dict[str, Any]

def download_file_from_url(url: str, temp_dir: str) -> str:
    """Download file from URL and return local path"""
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()

        # Determine file extension from URL or content-type
        content_type = response.headers.get('content-type', '')
        if 'pdf' in content_type:
            ext = '.pdf'
        elif 'document' in content_type or 'docx' in url.lower():
            ext = '.docx'
        else:
            # Fallback: try to get from URL
            if url.lower().endswith('.pdf'):
                ext = '.pdf'
            elif url.lower().endswith('.docx'):
                ext = '.docx'
            else:
                ext = '.pdf'  # Default to PDF

        temp_file = os.path.join(temp_dir, f"temp_resume{ext}")
        with open(temp_file, 'wb') as f:
            f.write(response.content)

        return temp_file
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to download file: {str(e)}")

@app.post("/segment-jd", response_model=JDSegmentationResponse)
async def segment_jd_endpoint(request: JDSegmentationRequest):
    """Segment raw JD text into structured JSON"""
    try:
        # Segment the JD
        segmented = segment_job_description(request.jd_text)

        # Format into JSON structure
        formatted = format_job_description_text(segmented)

        return JDSegmentationResponse(segmented_jd=formatted)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"JD segmentation failed: {str(e)}")

@app.post("/evaluate-resume", response_model=ResumeEvaluationResponse)
async def evaluate_resume_endpoint(request: ResumeEvaluationRequest, background_tasks: BackgroundTasks):
    """Download resume from Cloudinary, process it, and evaluate against JD"""
    temp_file = None
    try:
        # Create temp directory for file download
        with tempfile.TemporaryDirectory() as temp_dir:
            # Download resume file
            temp_file = download_file_from_url(request.resume_url, temp_dir)
            print(f"[DEBUG] Downloaded resume to: {temp_file}")

            # Load and extract text from resume
            resume_text = load_resume(temp_file)
            print(f"[DEBUG] Extracted resume text length: {len(resume_text)} chars")
            print(f"[DEBUG] Resume text preview: {resume_text[:500]}...")

            if not resume_text or len(resume_text.strip()) < 50:
                raise HTTPException(status_code=400, detail="Could not extract text from resume - file may be corrupted or empty")

            # Segment the resume
            segmented_resume = segment_resume(resume_text)
            print(f"[DEBUG] Segmented resume")

            # Format into JSON structure
            formatted_resume = format_resume_text(segmented_resume)
            print(f"[DEBUG] Formatted resume into JSON")

            # Extract personal information (name, email, phone)
            personal_info = {}
            import re

            # Get personal info - can be dict or string
            personal_info_data = formatted_resume.get('Personal Information', {})

            # If it's a structured dict, extract directly
            if isinstance(personal_info_data, dict):
                if 'Name' in personal_info_data and personal_info_data['Name']:
                    personal_info['full_name'] = personal_info_data['Name']
                    print(f"[DEBUG] Extracted name from dict: {personal_info['full_name']}")

                if 'Email' in personal_info_data and personal_info_data['Email']:
                    personal_info['email'] = personal_info_data['Email']
                    print(f"[DEBUG] Extracted email from dict: {personal_info['email']}")

            # If we still don't have name or email, try parsing from resume text
            if not personal_info.get('email'):
                email_match = re.search(r'[\w.-]+@[\w.-]+\.\w+', resume_text[:500])
                if email_match:
                    personal_info['email'] = email_match.group(0)
                    print(f"[DEBUG] Extracted email from text: {personal_info['email']}")

            if not personal_info.get('full_name'):
                # Extract name from first line of resume
                lines = [l.strip() for l in resume_text.split('\n') if l.strip()]
                if lines:
                    potential_name = lines[0]
                    # Remove email and phone if on same line
                    potential_name = re.sub(r'[\w.-]+@[\w.-]+\.\w+', '', potential_name).strip()
                    potential_name = re.sub(r'[\d\s\-\+\(\)]{10,}', '', potential_name).strip()
                    if potential_name and len(potential_name) > 2 and len(potential_name) < 50:
                        personal_info['full_name'] = potential_name
                        print(f"[DEBUG] Extracted name from text: {personal_info['full_name']}")

            # Convert JD JSON to text for evaluation
            jd_text = str(request.jd_json)
            print(f"[DEBUG] JD text length: {len(jd_text)} chars")

            # Evaluate resume against JD
            evaluation = evaluate_resume(formatted_resume, jd_text)
            print(f"[DEBUG] Raw evaluation from AI: {evaluation}")

            # Add personal info to evaluation response (even if evaluation is empty)
            if not evaluation:
                evaluation = {}
                print("[WARNING] Evaluation returned empty - AI parsing may have failed")

            evaluation['personal_info'] = personal_info
            print(f"[DEBUG] Final evaluation with personal info: {evaluation}")

            # Don't fail if evaluation is empty - at least return personal info
            # if not evaluation or len(evaluation) <= 1:  # Only has personal_info
            #     raise HTTPException(status_code=500, detail="Evaluation returned empty result - check OpenAI API configuration")

            return ResumeEvaluationResponse(evaluation=evaluation)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Resume evaluation failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Resume evaluation failed: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AI Recruit API Server")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind to")
    args = parser.parse_args()

    print(f"Starting server on {args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port)
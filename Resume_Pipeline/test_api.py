#!/usr/bin/env python3
"""
Test script for the AI Recruit API server
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Health check: {response.status_code}")
        print(response.json())
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_jd_segmentation():
    """Test JD segmentation"""
    jd_text = """
    Senior Software Engineer

    We are looking for an experienced Software Engineer to join our team.

    Requirements:
    - 5+ years of experience in Python
    - Experience with Django or Flask
    - Knowledge of REST APIs
    - Bachelor's degree in Computer Science

    Responsibilities:
    - Develop web applications
    - Collaborate with cross-functional teams
    - Code reviews and mentoring

    Benefits:
    - Competitive salary
    - Health insurance
    - Remote work options
    """

    payload = {"jd_text": jd_text}

    try:
        response = requests.post(f"{BASE_URL}/segment-jd", json=payload)
        print(f"JD Segmentation: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("Segmented JD keys:", list(result['segmented_jd'].keys()))
            return True
        else:
            print("Error:", response.text)
            return False
    except Exception as e:
        print(f"JD segmentation test failed: {e}")
        return False

def test_resume_evaluation():
    """Test resume evaluation with mock data"""
    # This would need a real Cloudinary URL and JD JSON
    # For testing, we'll skip this or use mock data

    print("Resume evaluation test: Skipped (requires real Cloudinary URL)")
    return True

if __name__ == "__main__":
    print("Testing AI Recruit API Server")
    print("=" * 40)

    # Test health
    if not test_health():
        print("Server not running. Start with: python -m finalCode.api_server")
        exit(1)

    # Test JD segmentation
    test_jd_segmentation()

    # Test resume evaluation
    test_resume_evaluation()

    print("Testing complete!")
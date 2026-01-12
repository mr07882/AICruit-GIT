# AI Recruit API Server

This API server provides endpoints for processing job descriptions and resumes using AI-powered segmentation and evaluation.

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables (copy from .env):
```bash
cp .env.example .env
# Edit .env with your OpenAI API keys
```

## Running the Server

```bash
python -m finalCode.api_server
```

The server will start on http://localhost:8000

## API Endpoints

### 1. JD Segmentation
**POST** `/segment-jd`

Segments raw job description text into structured JSON format.

**Request:**
```json
{
  "jd_text": "Senior Software Engineer\n\nWe are looking for an experienced Software Engineer to join our team.\n\nRequirements:\n- 5+ years of experience in Python\n- Experience with Django or Flask\n- Knowledge of REST APIs\n- Bachelor's degree in Computer Science\n\nNice to have:\n- Experience with microservices\n- Cloud experience (AWS/Azure)\n- Docker knowledge"
}
```

**Response:**
```json
{
  "segmented_jd": {
    "Non-Negotiable Requirements": [
      "3–6 years of hands-on experience in Java development",
      "Strong understanding of Java fundamentals",
      "Experience with Spring Boot or similar Java frameworks"
    ],
    "Negotiable Requirements": [
      "Experience with microservices and distributed systems",
      "Exposure to cloud services (AWS, Azure, or GCP)",
      "Familiarity with Kafka, RabbitMQ, or other messaging queues"
    ]
  }
}
```

### 2. Resume Evaluation
**POST** `/evaluate-resume`

Downloads a resume from Cloudinary, processes it, and evaluates it against a segmented JD.

**Request:**
```json
{
  "resume_url": "https://res.cloudinary.com/.../resume.pdf",
  "jd_json": {
    "Non-Negotiable Requirements": [
      "3–6 years of hands-on experience in Java development",
      "Strong understanding of Java fundamentals",
      "Experience with Spring Boot or similar Java frameworks"
    ],
    "Negotiable Requirements": [
      "Experience with microservices and distributed systems",
      "Exposure to cloud services (AWS, Azure, or GCP)"
    ]
  }
}
```

**Response:**
```json
{
  "evaluation": {
    "Fulfillment with Non-Negotiable Criteria": {
      "score": "8/10",
      "description": "Candidate meets Python requirement..."
    },
    "Fulfillment with Negotiable Criteria": {
      "score": "7/10",
      "description": "Has Java experience..."
    },
    "Continuity and Recency of Experience": {
      "score": "9/10",
      "description": "Recent experience in relevant technologies..."
    }
  }
}
```

### 3. Health Check
**GET** `/health`

Returns server health status.

**Response:**
```json
{
  "status": "healthy"
}
```

## Supported File Formats

- **Resumes**: PDF, DOCX
- **Job Descriptions**: Plain text

## Error Handling

The API returns appropriate HTTP status codes:
- `200`: Success
- `400`: Bad request (invalid input)
- `500`: Internal server error

Error responses include a `detail` field with error description.

## Backend Integration Strategy

### Request Flow

1. **JD Processing**:
   - Backend sends raw JD text
   - API segments and formats it
   - Returns structured JSON for storage

2. **Resume Evaluation**:
   - Backend provides Cloudinary resume URL + stored JD JSON
   - API downloads resume, processes it, evaluates against JD
   - Returns evaluation results

### Authentication

Add authentication middleware as needed (API keys, JWT tokens).

### Scaling

- Use async processing for large files
- Implement caching for repeated JD evaluations
- Consider background task processing for heavy operations

### Deployment

Deploy behind a reverse proxy (nginx) with SSL termination. Use containerization (Docker) for easy deployment.
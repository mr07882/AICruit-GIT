import os

# OpenAI / Azure OpenAI settings (prefer environment variables)
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY") or os.environ.get("AZURE_OPENAI_KEY")
OPENAI_ENDPOINT = os.environ.get(
    "OPENAI_ENDPOINT",
    "https://umaircopilotllms.openai.azure.com/openai/v1/",
)
DEPLOYMENT_NAME = os.environ.get("DEPLOYMENT_NAME", "o4-mini")

# Common defaults: keep all IO inside the finalCode package directory
BASE = os.path.abspath(os.path.dirname(__file__))

# Job description paths (inside finalCode)
JD_INPUT_FOLDER = os.environ.get("JD_INPUT_FOLDER", os.path.join(BASE, "jds"))
JD_SEGMENTED_FOLDER = os.environ.get("JD_SEGMENTED_FOLDER", os.path.join(BASE, "segmented_jds"))
JD_SEGMENTED_JSON_FOLDER = os.environ.get(
    "JD_SEGMENTED_JSON_FOLDER", os.path.join(BASE, "segmented_jds_json")
)

# Resume segmentation paths (inside finalCode)
RESUME_PARSED_FOLDER = os.environ.get("RESUME_PARSED_FOLDER", os.path.join(BASE, "parsed_resumes"))
RESUME_SEGMENTED_FOLDER = os.environ.get("RESUME_SEGMENTED_FOLDER", os.path.join(BASE, "segmented_resumes"))
RESUME_SEGMENTED_JSON_FOLDER = os.environ.get(
    "RESUME_SEGMENTED_JSON_FOLDER", os.path.join(BASE, "segmented_resumes_json")
)

# Loader paths (raw PDFs -> parsed .txt) inside finalCode
RESUME_RAW_FOLDER = os.environ.get("RESUME_RAW_FOLDER", os.path.join(BASE, "raw_resumes"))
RESUME_PARSED_OUTPUT = os.environ.get("RESUME_PARSED_OUTPUT", RESUME_PARSED_FOLDER)

# Scoring output
SCORING_OUTPUT_FOLDER = os.environ.get("SCORING_OUTPUT_FOLDER", os.path.join(BASE, "evaluated_resumes"))

# General
SKIP_EXISTING = os.environ.get("SKIP_EXISTING", "True").lower() in ("1", "true", "yes")

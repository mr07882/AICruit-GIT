from openai import OpenAI
from . import config
import os
import logging
import time
from typing import List, Dict, Any
try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None

_client = None
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def get_client():
    """Return a cached OpenAI client configured for Azure/OpenAI.

    Raises RuntimeError if API key missing.
    """
    global _client
    if _client is not None:
        return _client

    # First prefer any API key already present in the environment
    api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("AZURE_OPENAI_KEY")

    # If not present and python-dotenv is available, try loading finalCode/.env
    if not api_key and load_dotenv:
        env_path = os.path.join(config.BASE, ".env")
        try:
            load_dotenv(env_path)
            api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("AZURE_OPENAI_KEY")
        except Exception:
            pass

    # Fallback to value read when config was imported (if any)
    if not api_key:
        api_key = config.OPENAI_API_KEY

    if not api_key:
        raise RuntimeError("OPENAI_API_KEY or AZURE_OPENAI_KEY must be set in environment")

    _client = OpenAI(base_url=config.OPENAI_ENDPOINT, api_key=api_key)
    return _client


def call_chat_completions(messages: List[Dict[str, Any]], model: str = None, max_retries: int = 3, backoff: float = 1.0):
    """Call the chat.completions.create endpoint with simple retry/backoff and logging.

    Returns the response object on success. Raises the last exception on failure.
    """
    client = get_client()
    model = model or config.DEPLOYMENT_NAME

    last_exc = None
    for attempt in range(1, max_retries + 1):
        try:
            logger.info("OpenAI request attempt %s for model %s", attempt, model)
            resp = client.chat.completions.create(model=model, messages=messages)
            return resp
        except Exception as e:
            last_exc = e
            wait = backoff * (2 ** (attempt - 1))
            logger.warning("OpenAI request failed (attempt %s/%s): %s; retrying in %.1fs", attempt, max_retries, e, wait)
            time.sleep(wait)

    logger.error("OpenAI request failed after %s attempts", max_retries)
    raise last_exc


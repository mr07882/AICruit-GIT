"""Utility to configure structured logging for finalCode."""
import logging


def setup_logging(verbose: bool = False):
    level = logging.DEBUG if verbose else logging.INFO
    fmt = "%(asctime)s %(levelname)s %(name)s: %(message)s"
    logging.basicConfig(level=level, format=fmt)
    # reduce noise from some libraries if not verbose
    if not verbose:
        logging.getLogger("urllib3").setLevel(logging.WARNING)

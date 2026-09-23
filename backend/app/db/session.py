import os
import logging
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

DEFAULT_DATABASE_URL = "postgresql+psycopg://postgres:postgres@localhost:5432/lexlens"
DATABASE_URL = os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL)

Base = declarative_base()


class DatabaseUnavailableError(Exception):
    """Raised when PostgreSQL database connection fails."""
    def __init__(self, message: str = "PostgreSQL database is currently unavailable"):
        self.message = message
        super().__init__(self.message)


_engine = None
_session_factory = None


import time
import socket
from urllib.parse import urlparse

_db_avail_cache = {"result": False, "checked_at": 0.0}


def get_engine():
    global _engine
    if _engine is None:
        try:
            connect_args = {}
            if "psycopg" in DATABASE_URL:
                connect_args["connect_timeout"] = 1

            _engine = create_engine(
                DATABASE_URL,
                pool_pre_ping=True,
                echo=False,
                connect_args=connect_args,
            )
        except Exception as exc:
            logger.warning("Failed to initialize database engine for %s: %s", DATABASE_URL, exc)
            return None
    return _engine


def get_session_factory():
    global _session_factory
    if _session_factory is None:
        eng = get_engine()
        if eng is not None:
            _session_factory = sessionmaker(autocommit=False, autoflush=False, bind=eng)
    return _session_factory


# For backwards-compatible imports
SessionLocal = get_session_factory
engine = get_engine()


def is_database_available(force_refresh: bool = False) -> bool:
    """Fast check if PostgreSQL server is ready without blocking tests."""
    global _db_avail_cache
    now = time.time()
    if not force_refresh and (now - _db_avail_cache["checked_at"] < 10.0):
        return _db_avail_cache["result"]

    try:
        # Quick socket check on target host:port
        parsed = urlparse(DATABASE_URL)
        host = parsed.hostname or "localhost"
        port = parsed.port or 5432
        with socket.create_connection((host, port), timeout=0.2):
            pass
    except Exception:
        _db_avail_cache = {"result": False, "checked_at": now}
        return False

    eng = get_engine()
    if eng is None:
        _db_avail_cache = {"result": False, "checked_at": now}
        return False

    try:
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        _db_avail_cache = {"result": True, "checked_at": now}
        return True
    except Exception as exc:
        logger.debug("Database probe failed: %s", exc)
        _db_avail_cache = {"result": False, "checked_at": now}
        return False


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency yielding a SQLAlchemy session.
    Raises DatabaseUnavailableError if the database is unreachable.
    """
    factory = get_session_factory()
    if factory is None:
        raise DatabaseUnavailableError("Database engine is not configured or reachable.")

    session = None
    try:
        session = factory()
        yield session
    except (OperationalError, SQLAlchemyError) as exc:
        logger.error("Database session error: %s", exc)
        raise DatabaseUnavailableError(f"Database error: {str(exc)}") from exc
    finally:
        if session:
            session.close()

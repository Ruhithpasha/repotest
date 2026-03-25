# src/config/postgres.py

import sys
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from src.config.settings import settings


# ── Build async URL from the existing DATABASE_URL ───────────────────────────
# The .env has:  postgresql://...  (Sequelize format)
# asyncpg needs: postgresql+asyncpg://...
def _build_async_url(url: str) -> str:
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


ASYNC_DATABASE_URL = _build_async_url(settings.DATABASE_URL)

# ── Engine ────────────────────────────────────────────────────────────────────
# Pool settings mirror postgres.js:
#   pool.max   = 5   → pool_size=5
#   pool.min   = 0   → (default)
#   acquire    = 30s → pool_timeout=30
#   idle       = 10s → pool_recycle=10 (but 300 is safer for Supabase)
engine = create_async_engine(
    ASYNC_DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=300,    # recycle every 5 min — prevents Supabase idle disconnects
    pool_pre_ping=True,  # test connection before use — replaces rejectUnauthorized behaviour
    connect_args={
        "ssl": "require",                        # same as ssl.require=true in postgres.js
        "server_settings": {
            "application_name": "plant4growth_api"
        },
    },
)

# ── Session factory ───────────────────────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# ── Declarative base — all models inherit from this ───────────────────────────
class Base(DeclarativeBase):
    pass

# ── FastAPI dependency — inject a DB session into any route ──────────────────
# Usage in a route:
#   async def my_route(db: AsyncSession = Depends(get_db)): ...
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# ── Startup connection check — replaces sequelize.authenticate() ─────────────
# Call this from main.py lifespan on startup
async def connect_db():
    if not settings.DATABASE_URL:
        print("DATABASE_URL environment variable is required")
        sys.exit(1)
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        print("PostgreSQL connected successfully")
        # NOTE: No sequelize.sync({ alter: true }) equivalent here.
        # Schema is managed by Alembic. Run: alembic upgrade head
    except Exception as error:
        print(f"PostgreSQL connection error: {error}")
        sys.exit(1)
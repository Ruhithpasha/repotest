# src/config/settings.py

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str

    # ── Authentication ────────────────────────────────────────────────────────
    JWT_SECRET: str
    SSO_SECRET_KEY: str = ""
    COURSE_PLATFORM_URL: str = ""

    # ── Stripe ────────────────────────────────────────────────────────────────
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # ── AWS S3 ────────────────────────────────────────────────────────────────
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "eu-north-1"
    AWS_S3_BUCKET: str = ""

    # ── GoHighLevel ───────────────────────────────────────────────────────────
    GHL_API_KEY: str = ""
    GHL_LOCATION_ID: str = ""
    GHL_CALENDAR_ID: str = ""
    GHL_BOOKING_URL: str = ""
    GHL_WEBHOOK_SECRET: str = ""

    # ── Notifications ─────────────────────────────────────────────────────────
    NOTIFICATION_EMAIL_1: str = ""
    NOTIFICATION_EMAIL_2: str = ""
    NOTIFICATION_EMAIL_3: str = ""
    TEAM_WHATSAPP_NUMBER: str = "+447352062709"
    PAYMENT_URL: str = ""
    FRONTEND_URL: str = ""

    # ── Server ────────────────────────────────────────────────────────────────
    CORS_ORIGINS: str = "*"
    PORT: int = 8001

    # ── Commission automation ─────────────────────────────────────────────────
    AUTO_APPROVE_THRESHOLD: float = 0.0

    class Config:
        env_file = ".env"
        extra = "ignore"   # silently ignores MONGO_URL, DB_NAME, EMERGENT_LLM_KEY etc.


settings = Settings()
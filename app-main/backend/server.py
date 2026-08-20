from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse, HTMLResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import hmac
import hashlib
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any
import uuid
from datetime import datetime, timezone, date, timedelta

import razorpay
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

# SET UP LOGGING FIRST - before routes reference logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
# Only load .env locally (not in Railway/production)
# Railway sets env vars directly via dashboard
if not os.environ.get("RAILWAY_ENVIRONMENT"):
    load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Log environment config

import asyncio
import sys

# Fix Playwright subprocess issue on Windows (Python 3.12)
if sys.platform.startswith("win"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from typing import Optional
import base64
import re

import cv2
import httpx
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from playwright.async_api import async_playwright


app = FastAPI(title="SafeScan Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScanRequest(BaseModel):
    url: str


class ScanImageBase64Request(BaseModel):
    image_base64: str


class ScanResponse(BaseModel):
    expanded_url: str
    risk_score: int
    verdict: str
    screenshot_base64: Optional[str] = None
    details: Optional[str] = None


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


def decode_qr_from_image_bytes(data: bytes) -> Optional[str]:
    """Decode first QR code found in image bytes."""
    arr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)

    if img is None:
        return None

    detector = cv2.QRCodeDetector()
    value, _points, _ = detector.detectAndDecode(img)

    return value.strip() if value else None


def looks_like_url(s: str) -> bool:
    """Check if string looks like an HTTP URL."""
    if not s or len(s) > 2048:
        return False

    return bool(re.match(r"^https?://\S+", s.strip()))


def normalize_url(raw: str) -> str:
    """Ensure URL has scheme."""
    s = raw.strip()

    if not re.match(r"^https?://", s, re.IGNORECASE):
        s = "https://" + s

    return s


async def expand_url(url: str) -> str:
    """Follow redirects to get final URL."""
    async with httpx.AsyncClient(follow_redirects=True, timeout=10) as client:
        try:
            resp = await client.get(url)
            return str(resp.url)
        except Exception:
            return url


async def check_safe_browsing(url: str) -> tuple[int, str, str]:
    """
    Simple heuristic phishing detection.
    Returns risk_score, verdict, details
    """

    lowered = url.lower()
    score = 10

    # http instead of https
    if lowered.startswith("http://"):
        score += 15

    # IP address host
    if "://" in lowered:
        host = lowered.split("://", 1)[1].split("/", 1)[0]

        if all(ch.isdigit() or ch == "." for ch in host):
            score += 20

    # phishing keywords
    suspicious_keywords = [
        "login",
        "signin",
        "verify",
        "update",
        "secure",
        "wallet",
        "bank",
    ]

    for kw in suspicious_keywords:
        if kw in lowered:
            score += 10

    # long URLs
    if len(lowered) > 80:
        score += 10

    if "?" in lowered and len(lowered.split("?", 1)[1]) > 40:
        score += 10

    # suspicious TLD
    if any(tld in lowered for tld in [".ru", ".cn", ".tk"]):
        score += 20

    # many subdomains
    if "://" in lowered:
        host = lowered.split("://", 1)[1].split("/", 1)[0]

        if host.count(".") >= 3:
            score += 10

    score = max(0, min(score, 100))

    verdict = "low"

    if score >= 70:
        verdict = "high"
    elif score >= 40:
        verdict = "medium"

    return score, verdict, "Heuristic-only risk estimate (no external reputation service)."


async def capture_screenshot(url: str) -> Optional[str]:
    """
    Capture webpage screenshot using Playwright.
    """

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)

            page = await browser.new_page()

            await page.goto(
                url,
                wait_until="domcontentloaded",
                timeout=15000
            )

            png_bytes = await page.screenshot(full_page=True)

            await browser.close()

        return base64.b64encode(png_bytes).decode("ascii")

    except Exception:
        return None


async def analyse_url(target_url: str) -> ScanResponse:
    """Main analysis pipeline."""

    expanded = await expand_url(target_url)

    risk_score, verdict, reputation_details = await check_safe_browsing(expanded)

    screenshot_b64 = await capture_screenshot(expanded)

    return ScanResponse(
        expanded_url=expanded,
        risk_score=risk_score,
        verdict=verdict,
        screenshot_base64=screenshot_b64,
        details=reputation_details,
    )


@app.post("/scan", response_model=ScanResponse)
async def scan_url(payload: ScanRequest) -> ScanResponse:
    raw = payload.url.strip()

    if not raw:
        raise HTTPException(status_code=400, detail="URL is required.")

    url = normalize_url(raw)

    if not looks_like_url(url):
        raise HTTPException(status_code=400, detail="Invalid URL.")

    return await analyse_url(url)


@app.post("/scan-image-base64", response_model=ScanResponse)
async def scan_image_base64(req: ScanImageBase64Request) -> ScanResponse:
    """Decode QR from base64 image (JSON). Works reliably from React Native."""
    try:
        data = base64.b64decode(req.image_base64, validate=True)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image.")

    if not data:
        raise HTTPException(status_code=400, detail="Empty image.")

    decoded = decode_qr_from_image_bytes(data)

    if not decoded:
        raise HTTPException(
            status_code=400,
            detail="No QR code found or could not decode.",
        )

    url = normalize_url(decoded)

    if not looks_like_url(url):
        raise HTTPException(
            status_code=400,
            detail="QR does not contain a valid URL.",
        )

    return await analyse_url(url)


@app.post("/scan-image", response_model=ScanResponse)
async def scan_image(file: UploadFile = File(...)) -> ScanResponse:
    """Decode QR from uploaded image and analyse URL."""
    # Be lenient: React Native / some clients may not send Content-Type for the part
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    data = await file.read()

    if not data:
        raise HTTPException(status_code=400, detail="Empty file.")

    decoded = decode_qr_from_image_bytes(data)

    if not decoded:
        raise HTTPException(
            status_code=400,
            detail="No QR code found or could not decode."
        )

    url = normalize_url(decoded)

    if not looks_like_url(url):
        raise HTTPException(
            status_code=400,
            detail="QR does not contain a valid URL."
        )

    return await analyse_url(url)
from typing import Optional
import base64
import os

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
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
    url: HttpUrl


class ScanResponse(BaseModel):
    expanded_url: str
    risk_score: int
    verdict: str
    screenshot_base64: Optional[str] = None
    details: Optional[str] = None


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


async def expand_url(url: str) -> str:
    async with httpx.AsyncClient(follow_redirects=True, timeout=10) as client:
        try:
            resp = await client.get(url)
            return str(resp.url)
        except Exception:
            return url


async def check_safe_browsing(url: str) -> tuple[int, str, str]:
    """
    Hook for Google Safe Browsing or other reputation services.
    Currently uses only heuristic scoring for demo purposes.
    Returns (risk_score, verdict, details) without calling external APIs.
    """
    # Heuristic-only risk estimate for demo.
    lowered = url.lower()
    score = 10

    # 1) Protocol: http is riskier than https.
    if lowered.startswith("http://"):
        score += 15

    # 2) Raw IP address host is suspicious.
    if "://" in lowered:
        host_and_path = lowered.split("://", 1)[1]
        host = host_and_path.split("/", 1)[0]
        if all(ch.isdigit() or ch == "." for ch in host):
            score += 20

    # 3) Suspicious keywords often used in phishing.
    suspicious_keywords = ["login", "signin", "verify", "update", "secure", "wallet", "bank"]
    for kw in suspicious_keywords:
        if kw in lowered:
            score += 10

    # 4) Very long URLs and query strings look more suspicious.
    if len(lowered) > 80:
        score += 10
    if "?" in lowered and len(lowered.split("?", 1)[1]) > 40:
        score += 10

    # 5) TLD heuristics.
    if any(tld in lowered for tld in [".ru", ".cn", ".tk"]):
        score += 20

    # 6) Multiple subdomains (e.g. login.secure.example.com).
    if "://" in lowered:
        host = lowered.split("://", 1)[1].split("/", 1)[0]
        if host.count(".") >= 3:
            score += 10

    # Clamp score into 0–100.
    score = max(0, min(score, 100))

    verdict = "low"
    if score >= 70:
        verdict = "high"
    elif score >= 40:
        verdict = "medium"
    return score, verdict, "Heuristic-only risk estimate (no external reputation service)."


async def capture_screenshot(url: str) -> Optional[str]:
    """
    Capture a PNG screenshot of the given URL with Playwright and return it as base64.
    Requires that `playwright install chromium` has been run once.
    """
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url, wait_until="networkidle", timeout=15000)
            png_bytes = await page.screenshot(full_page=True)
            await browser.close()
        return base64.b64encode(png_bytes).decode("ascii")
    except Exception:
        return None


@app.post("/scan", response_model=ScanResponse)
async def scan_url(payload: ScanRequest) -> ScanResponse:
    target_url = str(payload.url)
    expanded = await expand_url(target_url)

    risk_score, verdict, reputation_details = await check_safe_browsing(expanded)
    screenshot_b64 = await capture_screenshot(expanded)

    if risk_score is None:
        raise HTTPException(status_code=500, detail="Unable to analyse URL")

    return ScanResponse(
        expanded_url=expanded,
        risk_score=risk_score,
        verdict=verdict,
        screenshot_base64=screenshot_b64,
        details=reputation_details,
    )


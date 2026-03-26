import uvicorn
import time
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from db import fetch_lead_info
from slowapi.util import get_remote_address
from utils import format_sse
from scraper import scraper
from config import logger

# Rate limiting
limiter = Limiter(key_func=get_remote_address)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Error handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    logger.error(f"Validation error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request, exc):
    logger.warning(f"Rate limit exceeded: {request.client.host}")
    return StreamingResponse(
        _generate_error_stream("Rate limit exceeded. Only 50 requests per day allowed.", type="RATE_LIMITED"),
        media_type="text/event-stream"
    )


@app.get("/horus/{lead_id}")
@limiter.limit("20/day") 
async def fetch_ai_response(request: Request, lead_id: str):
    """Endpoint that returns a streaming response with company info"""
    logger.info(f"Processing request for lead_id: {lead_id}")
    
    if not lead_id:
        logger.warning("Lead ID not provided")
        raise HTTPException(status_code=400, detail="Lead ID not provided")
    
    try:
        lead = fetch_lead_info(lead_id)
        if not lead:
            logger.warning(f"Lead not found: {lead_id}")
            return StreamingResponse(
                _generate_error_stream("Lead not found", "LEAD_ERROR"),
                media_type="text/event-stream"
            )
        
        if not lead.get("linkedinTag",None) or not lead.get("companyName", None):
            logger.warning(f"Lead details not found: {lead_id}")
            return StreamingResponse(
                _generate_error_stream("Lead details not found","LEAD_ERROR"),
                media_type="text/event-stream"
            )
            
        logger.info(f"Generating company info for: {lead.get('companyName')}")

        return StreamingResponse(
            generate_company_info(
                lead["linkedinTag"],
                lead["companyName"],
                lead.get("website"),
                lead.get("twitterHandle"),
                lead.get("industry")
            ),
            media_type="text/event-stream"
        )
        
    except Exception as e:
        logger.error(f"Error processing request: {e}", exc_info=True)
        
        return StreamingResponse(
            _generate_error_stream(f"Internal server error"),
            media_type="text/event-stream"
        )


async def _generate_error_stream(message: str, type:str="ERROR"):
    """Generate SSE stream with error message"""
    
    yield format_sse("toast", {"type": type, "message": message})


async def generate_company_info(linkedin_tag: str, company_name: str, website: str = None, twitter_handle: str = None, industry: str = None):
    """Generate SSE stream of info about the company"""
    start_time = time.time()

    logger.info(f"Starting company info generation for: {company_name}")

    try:
        async for event in scraper(linkedin_tag, company_name, website, twitter_handle, industry):
            yield event

    except Exception as e:
        logger.error(f"Error generating company info: {e}", exc_info=True)
        yield format_sse("toast", {"type": "ERROR", "message": "Error generating company info"})

    finally:
        elapsed = time.time() - start_time
        logger.info(f"Company info generation completed in {elapsed:.2f}s for: {company_name}")



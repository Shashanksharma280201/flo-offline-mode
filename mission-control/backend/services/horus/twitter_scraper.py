import json
import requests
from config import settings
from utils import format_sse

async def twitter_scraper(crawler, twitter_handle: str, company_name: str):
    """
    Scrape Twitter/X mentions and posts for a company
    Uses Google Custom Search to find recent tweets (since Twitter API requires auth)
    """
    yield format_sse("progress", {"type": "TWITTER", "status": "START"})

    # Clean up twitter handle (remove @ if present)
    if twitter_handle and twitter_handle.startswith("@"):
        twitter_handle = twitter_handle[1:]

    # Build search query
    if twitter_handle:
        # Search for tweets from this specific account
        query = f"site:twitter.com OR site:x.com from:{twitter_handle}"
    else:
        # Search for tweets mentioning the company
        query = f"site:twitter.com OR site:x.com {company_name}"

    try:
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            "key": settings.google_search_api_key,
            "cx": settings.google_search_cx,
            "q": query,
            "num": 5,  # Get 5 recent tweets
            "gl": "in",
        }

        response = requests.get(url, params=params)

        if response.status_code == 200:
            data = response.json()
            items = data.get("items", [])

            if items:
                # Format Twitter results
                twitter_results = ""
                for item in items:
                    title = item.get("title", "")
                    snippet = item.get("snippet", "")
                    twitter_results += f"Tweet: {title}\n{snippet}\n\n"

                yield format_sse("progress", {"type": "TWITTER", "status": "SUCCESS"})
                yield json.dumps({"twitter_results": twitter_results.strip()})+"\n\n"
            else:
                yield format_sse("progress", {"type": "TWITTER", "status": "SUCCESS"})
                yield json.dumps({"twitter_results": ""})+"\n\n"
        else:
            print(f"Twitter search error: {response.status_code}")
            yield format_sse("progress", {"type": "TWITTER", "status": "ERROR"})
            yield json.dumps({"twitter_results": ""})+"\n\n"

    except Exception as e:
        print(f"Error in twitter_scraper: {e}")
        yield format_sse("progress", {"type": "TWITTER", "status": "ERROR"})
        yield json.dumps({"twitter_results": ""})+"\n\n"

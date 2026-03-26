# Google Custom Search API Setup

The AI News feature requires Google Custom Search JSON API to fetch news articles and Twitter/X mentions. Currently, the API key in `.env` doesn't have this API enabled.

## Error Message
```
Error: 403, {
  "error": {
    "code": 403,
    "message": "This project does not have the access to Custom Search JSON API.",
    "status": "PERMISSION_DENIED"
  }
}
```

## How to Enable Custom Search API

### Step 1: Go to Google Cloud Console
1. Visit https://console.cloud.google.com/
2. Select your project (the one containing the API key: `AIzaSyAB6C3y0IXsTChR3VWouP73HTJSppi_vEY`)

### Step 2: Enable Custom Search JSON API
1. Go to **APIs & Services** > **Library**
2. Search for "Custom Search API"
3. Click on "Custom Search JSON API"
4. Click **ENABLE** button

### Step 3: Verify API is Enabled
1. Go to **APIs & Services** > **Enabled APIs & Services**
2. You should see "Custom Search JSON API" in the list

### Step 4: Test the API
After enabling, restart the horus service and test again:
```bash
curl http://localhost:9000/horus/69ae73f83fa80ced5f7dd62b
```

## Current API Keys in `.env`

```
GOOGLE_SEARCH_API_KEY="AIzaSyAB6C3y0IXsTChR3VWouP73HTJSppi_vEY"
GOOGLE_SEARCH_CX="2063388d8a7cd43ec"
```

## What's Working Now

✅ **LinkedIn Scraping** - Successfully fetching company LinkedIn posts
✅ **Company Blog Scraping** - Can scrape company blog/news pages
✅ **Browser Automation** - Chromium browser properly configured
✅ **SSE Streaming** - Real-time progress updates working
✅ **AI Summary Generation** - Gemini API generating summaries

## What Needs Google API

❌ **Google News Search** - Fetches 10 recent news articles
❌ **Twitter/X Search** - Uses Google Custom Search to find tweets

Both features use the same Google Custom Search JSON API that needs to be enabled.

## Alternative Solutions

If you cannot enable the API:
1. **Remove Google News & Twitter** - Comment out those scrapers in `scraper.py`
2. **Use Different API** - Replace with NewsAPI, Bing Search, or similar
3. **Manual News Input** - Allow users to paste news URLs directly

## Test Lead Created

A test lead has been created for Google:
- Lead ID: `69ae73f83fa80ced5f7dd62b`
- Company: Google
- LinkedIn: google
- Website: https://blog.google
- Industry: Technology

Test URL: http://localhost:3000/leads/69ae73f83fa80ced5f7dd62b

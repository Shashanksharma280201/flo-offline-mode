import json
import google.generativeai as genai
from crawl4ai import BrowserConfig, AsyncWebCrawler
from config import summary_system_prompt, settings
from websites import scrape_websites
from linkedin import linkedin_scraper
from twitter_scraper import twitter_scraper
from company_website_scraper import scrape_company_blog
from industry_sources import get_industry_search_query
from utils import format_sse
from db import add_summary_to_lead

# Configure Gemini API
genai.configure(api_key=settings.gemini_api_key)

async def scraper(linkedin_tag: str, company_name: str, website: str = None, twitter_handle: str = None, industry: str = None):
    browser_config = BrowserConfig(
        text_mode=True,
        light_mode=True,
        browser_type="chromium",
        cookies=settings.linkedin_cookies
    )

    async with AsyncWebCrawler(config=browser_config) as crawler:
        # 1. LinkedIn posts scraping
        linkedin_results = ""
        async for result in linkedin_scraper(crawler, linkedin_tag):
            if result.startswith("{"):
                linkedin_results = json.loads(result).get("linkedin_results", "")
            else:
                yield result

        # 2. Google News scraping (industry-specific query)
        search_query = get_industry_search_query(company_name, industry) if industry else f"Recent news about {company_name}"
        website_results = ""
        async for result in scrape_websites(crawler, search_query):
            if result.startswith("{"):
                website_results = json.loads(result).get("webscraping_results", "")
            yield result

        # 3. Twitter/X scraping (if handle provided)
        twitter_results = ""
        if twitter_handle or company_name:
            async for result in twitter_scraper(crawler, twitter_handle or "", company_name):
                if result.startswith("{"):
                    twitter_results = json.loads(result).get("twitter_results", "")
                else:
                    yield result

        # 4. Company blog scraping (if website provided)
        blog_results = ""
        if website:
            async for result in scrape_company_blog(crawler, website):
                if result.startswith("{"):
                    blog_results = json.loads(result).get("blog_results", "")
                else:
                    yield result

        # Aggregate all results
        if (linkedin_results or website_results or twitter_results or blog_results):
            all_results = ""

            if linkedin_results:
                all_results += f"=== LinkedIn Posts ===\n{linkedin_results}\n\n"

            if website_results:
                all_results += f"=== News Articles ===\n{website_results}\n\n"

            if twitter_results:
                all_results += f"=== Twitter/X Mentions ===\n{twitter_results}\n\n"

            if blog_results:
                all_results += f"=== Company Blog/News ===\n{blog_results}\n\n"

            # Generate AI summary
            yield format_sse("progress", {"type": "AI_RESPONSE", "status": "START"})
            complete_response = ""

            model = genai.GenerativeModel(
                'gemini-2.0-flash-exp',
                system_instruction=summary_system_prompt(company_name)
            )

            response = model.generate_content(
                all_results,
                generation_config=genai.GenerationConfig(
                    max_output_tokens=1000,
                    temperature=0.0
                ),
                stream=True
            )

            for chunk in response:
                if chunk.text:
                    complete_response += chunk.text
                    yield format_sse("ai_response", chunk.text)

            add_summary_to_lead(summary=complete_response, company_name=company_name)
            yield format_sse("progress", {"type": "AI_RESPONSE", "status": "SUCCESS"})


    
       

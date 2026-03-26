import asyncio
import json
import requests
from config import settings, scraper_llm_instruction
from pydantic import BaseModel
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, CacheMode, LLMExtractionStrategy
from crawl4ai.content_filter_strategy import PruningContentFilter
from crawl4ai.markdown_generation_strategy import DefaultMarkdownGenerator
from utils import format_sse

class Article(BaseModel):
    headline: str
    abstract: str

def fetch_posts(query: str):
    yield format_sse("progress", {"type": "WEB_SEARCH_RESULT", "status": "START"})
    
    url = "https://www.googleapis.com/customsearch/v1"
   
    params = {
        "key": settings.google_search_api_key,
        "cx": settings.google_search_cx,
        "q": query,
        "num": 10,  # Increased from 5 to 10 (max per request)
        "gl": "in",
        "cr": "countryIN",
    }

    response = requests.get(url, params=params)
  
    if response.status_code == 200:
        data = response.json()
        filtered_results = [item["link"] for item in data.get("items", [])]
        
        yield format_sse("progress", {"type": "WEB_SEARCH_RESULT", "status": "SUCCESS"})
        yield json.dumps({"posts": filtered_results})+"\n\n"
    
    else:
        print(f"Error: {response.status_code}, {response.text}")
        
        yield format_sse("progress", {"type": "WEB_SEARCH_RESULT", "status": "ERROR"})
        yield format_sse("toast", {"type": "ERROR", "message": "Error searching the web"})  
        yield json.dumps({"posts": []})+"\n\n"


async def scrape_websites(crawler:AsyncWebCrawler, query: str):
    
    posts = []
    
    for result in fetch_posts(query):
        if result.startswith("{"):
            posts = json.loads(result).get("posts", [])      
        else:
            yield result

    if (len(posts) == 0):
        print("No posts found.")
        return

    llm_strat = LLMExtractionStrategy(
        provider="gemini/gemini-2.0-flash-exp",
        api_token=settings.gemini_api_key,
        schema=Article.model_json_schema(),
        extraction_type="schema",
        instruction=scraper_llm_instruction
    )

    prune_filter = PruningContentFilter(
        threshold=0.40,           
        threshold_type="dynamic",
        min_word_threshold=5      
    )
  
    md_generator = DefaultMarkdownGenerator(content_filter=prune_filter)

    crawl_config = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        extraction_strategy=llm_strat,
        markdown_generator=md_generator,
        verbose=False,
        stream=True,
        magic=True,
        exclude_external_links=True,
        exclude_external_images=True,
        exclude_social_media_links=True,
        excluded_tags=["meta","form","br","a","footer", "style","header","nav","section","script"],
        remove_forms=True
    )
    
    yield format_sse("progress", {"type": "WEB_CRAWL", "status": "START"})

    final_results = []
    processed = 0 
    
    try:
        async for result in await crawler.arun_many(urls=posts, config=crawl_config):
            processed += 1
            if result.success:
                json_data = json.loads(result.extracted_content)
                final_results.append(json_data)
            else:
                print("Crawl failed: ", result.url)

            yield format_sse("progress", {"type": "WEB_CRAWL", "status": "LOADING", "data": { "progress": processed, "total": len(posts)}})
       
            formatted_results = ""
            for arr in final_results:
                for item in arr:
                    headline = (item.get("headline") or "").replace('\\', '')
                    abstract = (item.get("abstract") or "").replace('\\', '')
                    formatted_results += f"Headline: {headline}\nAbstract: {abstract}\n\n"

        yield json.dumps({'webscraping_results': formatted_results})+"\n\n"
        
    except asyncio.TimeoutError:
        print("Crawling timed out after 60 seconds.")
        yield format_sse("toast", {"type": "ERROR", "message": "Crawling timed out after 60 seconds."}) 
    
    except Exception as e:
        print(f"An error occurred: {e}")
        yield format_sse("toast", {"type": "ERROR", "message": "Error during web crawl"}) 

import re
import json
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, CacheMode
from crawl4ai.content_filter_strategy import PruningContentFilter
from crawl4ai.markdown_generation_strategy import DefaultMarkdownGenerator
from utils import format_sse

def parser(html:str):
  pattern = r'<span dir="ltr">(.*?)</span>'
  matches = re.findall(pattern, html, re.DOTALL)
  unique_posts = list(set(matches))
  
  results = ""
  for post in unique_posts:
      results += post.strip().replace("\xa0"," ").replace("&amp", "&")+"\n\n"
  return results.strip()


async def linkedin_scraper(crawler: AsyncWebCrawler,company_tag:str):
    yield format_sse("progress", {"type": "LINKEDIN", "status": "START"})

    prune_filter = PruningContentFilter(
        threshold=0.40,           
        threshold_type="dynamic",
        min_word_threshold=5      
    )
    
    md_generator = DefaultMarkdownGenerator(content_filter=prune_filter)

    run_config = CrawlerRunConfig(
        excluded_tags=["meta",'form',"br","a","footer", "style",'header',"nav","section","script"],
        process_iframes=False,
        remove_overlay_elements=True,
        cache_mode=CacheMode.BYPASS,
        js_code="window.scrollTo(0, document.body.scrollHeight);",
        markdown_generator=md_generator,
        verbose=False,
        magic=True,
        exclude_external_links=True,
        exclude_external_images=True,
        exclude_social_media_links=True,
        remove_forms=True
    )
    
    result = await crawler.arun(
        url=f"https://www.linkedin.com/company/{company_tag}/posts/?feedView=all&viewAsMember=true",
        config=run_config,  
    )

    if result.success:
        parsed_result = parser(result.html)
        yield format_sse("progress", {"type": "LINKEDIN", "status": "SUCCESS" })
        yield json.dumps({"linkedin_results": parsed_result })+"\n\n"
    else:
        yield format_sse("progress", {"type": "LINKEDIN", "status": "ERROR"})
        yield json.dumps({"linkedin_results": []})+"\n\n"
        print(f"Crawl failed: {result.error_message}")

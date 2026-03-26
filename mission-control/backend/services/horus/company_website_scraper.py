import json
from urllib.parse import urljoin, urlparse
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, CacheMode
from crawl4ai.content_filter_strategy import PruningContentFilter
from crawl4ai.markdown_generation_strategy import DefaultMarkdownGenerator
from utils import format_sse

async def scrape_company_blog(crawler: AsyncWebCrawler, website_url: str):
    """
    Scrape company's own blog/news section for official announcements
    """
    if not website_url:
        yield format_sse("progress", {"type": "COMPANY_BLOG", "status": "SKIPPED"})
        yield json.dumps({"blog_results": ""})+"\n\n"
        return

    yield format_sse("progress", {"type": "COMPANY_BLOG", "status": "START"})

    # Common blog/news URL patterns
    blog_paths = [
        "/blog",
        "/news",
        "/press",
        "/press-releases",
        "/media",
        "/newsroom",
        "/updates",
        "/announcements"
    ]

    # Parse base URL
    parsed_url = urlparse(website_url)
    base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"

    prune_filter = PruningContentFilter(
        threshold=0.40,
        threshold_type="dynamic",
        min_word_threshold=5
    )

    md_generator = DefaultMarkdownGenerator(content_filter=prune_filter)

    run_config = CrawlerRunConfig(
        excluded_tags=["meta", "form", "br", "a", "footer", "style", "header", "nav", "section", "script"],
        process_iframes=False,
        remove_overlay_elements=True,
        cache_mode=CacheMode.BYPASS,
        markdown_generator=md_generator,
        verbose=False,
        magic=True,
        exclude_external_links=True,
        exclude_external_images=True,
        exclude_social_media_links=True,
        remove_forms=True
    )

    blog_results = ""
    found_blog = False

    try:
        # Try to find blog/news page
        for path in blog_paths:
            blog_url = urljoin(base_url, path)

            try:
                result = await crawler.arun(
                    url=blog_url,
                    config=run_config
                )

                if result.success and result.markdown and len(result.markdown) > 200:
                    # Found a valid blog page
                    found_blog = True
                    # Extract first 2000 characters (recent posts summary)
                    blog_content = result.markdown[:2000]
                    blog_results += f"Source: {blog_url}\n\n{blog_content}\n\n"
                    break  # Stop after finding first valid blog page
            except Exception as e:
                print(f"Error crawling {blog_url}: {e}")
                continue

        if found_blog:
            yield format_sse("progress", {"type": "COMPANY_BLOG", "status": "SUCCESS"})
            yield json.dumps({"blog_results": blog_results.strip()})+"\n\n"
        else:
            yield format_sse("progress", {"type": "COMPANY_BLOG", "status": "NOT_FOUND"})
            yield json.dumps({"blog_results": ""})+"\n\n"

    except Exception as e:
        print(f"Error in scrape_company_blog: {e}")
        yield format_sse("progress", {"type": "COMPANY_BLOG", "status": "ERROR"})
        yield json.dumps({"blog_results": ""})+"\n\n"

import os
import json
import logging

from dotenv import load_dotenv 

# Load environment variables
load_dotenv()

logging.basicConfig(
    level=getattr(logging, "INFO"),
    format='[%(asctime)s]/[%(name)s]/[%(levelname)s]: %(message)s', 
)

logging.getLogger('google_genai').setLevel(logging.WARNING)  # Silence Google's genai logs
logging.getLogger('LiteLLM').setLevel(logging.WARNING)       # Silence LiteLLM logs
logging.getLogger('httpx').setLevel(logging.WARNING)         # Silence HTTPX logs if needed
logging.getLogger('asyncio').setLevel(logging.WARNING)       # Silence asyncio logs if needed

logger = logging.getLogger(__name__)

class Settings():
    # API Keys
    gemini_api_key: str = os.getenv("GEMINI_API_KEY")
    google_search_api_key: str = os.getenv("GOOGLE_SEARCH_API_KEY")
    google_search_cx: str = os.getenv("GOOGLE_SEARCH_CX")
    linkedin_cookies = json.loads(os.getenv("LINKEDIN_COOKIES"))
    # Database
    mongo_uri: str = os.getenv("MONGO_URI")
    
    # Encryption
    encryption_key: str = os.getenv("ENCRYPTION_KEY")

    class Config:
        env_file = ".env"

settings = Settings()

def summary_system_prompt(company_name:str) :
    return f"""
You are an AI assistant designed to generate comprehensive and actionable summaries
for a customer relationship management system.
You will be provided a company name and multiple sources of data about the company.
You will analyze the data about this company and extract key insights relevant to our sales team.

Your goal is to identify and summarize recent activities of the company, focusing on:
- **Product Launches**: New products, services, or features
- **Funding & Investments**: Funding rounds, investor announcements, valuations
- **Partnerships**: Strategic partnerships, collaborations, joint ventures
- **Expansion**: Geographical expansion, new offices, market entry
- **Projects**: Major projects, contracts, client wins
- **Acquisitions**: M&A activity, company acquisitions
- **Leadership**: C-suite changes, key hires
- **Recognition**: Awards, certifications, industry recognition

You will receive data from multiple sources:
- **LinkedIn Posts**: Recent posts from the company's LinkedIn profile
- **News Articles**: Headlines and abstracts from various news sources
- **Twitter/X**: Recent tweets and mentions about the company
- **Company Blog**: Official announcements and updates from the company's website

Output Format Requirements:
- Use **Markdown formatting** with clear sections
- **Prioritize recent information** (prefer news from last 3-6 months)
- **Be specific**: Include dates, numbers, locations, names where available
- **Avoid redundancy**: Don't repeat the same information from different sources
- **Source attribution**: Label each piece of information with its source type
- **Structure**: Use headers (##) for different categories
- **Concise but comprehensive**: Aim for clarity and actionability

Example Structure:
## Recent Updates
- [Date if available] Brief summary (Source: LinkedIn/News/Twitter/Blog)

## Key Developments
### Funding & Investments
- Details here

### Partnerships
- Details here

Company Name: {company_name}
"""

scraper_llm_instruction = """
You are a web scraper designed to extract relevant news article content about a company in question.
Given a URL, your task is to determine if it belongs to a valid news article and extract key details.

You are to return just one json object per article, so if you are provided with 10 URLS you should return 10 json objects.

## Extraction Criteria:
- The page must contain a **clearly identifiable headline** (not just 3-4 words).
- The page must contain at least one paragraph of readable text.
- If the page does not resemble a news article return an empty response.

## Expected Output:
### If it is a news article:
Return a JSON object containing:
- `headline`: The main headline of the article.
- `abstract`: The first few paragraphs summarizing the article.

**Example:**
URL: "https://www.ndtv.com/world-news/donald-trump-calls-for-end-to-us-public-funding-for-broadcasters-npr-pbs-8024018" 
Response: { "headline": "Trump Calls For End To US Public Funding For Broadcasters NPR, PBS", "abstract": "President Donald Trump called on Congress on Thursday to 'immediately' defund two public broadcasters as he and his supporters ratchet up their long-running battle with the US media. Trump's attacks on traditional media have intensified since his return to the White House, with the Republican president repeatedly attacking journalists critical of his administration..." }

### If it is NOT a news article:
Return an empty JSON object.

**Example:**
URL: "https://example.com/" 
Response: { "headline": "", "abstract": "" }

These are examples of invalid headlines, avoid adding them:
"Denis Stern", "Quadro Nuevo","Total Environment","Trio Bobo Ft. Varijashree Venugopal", "Terms & Conditions"

These are valid headlines:
"Total Environment appoints Pooja Gupta as Chief Human Resources Officer","HDFC Capital Invests Rs 13 Billion in Total Environment","Alok Mehta joins Total Environment Building Systems as Group CHRO and President"

Strictly follow this format.
"""
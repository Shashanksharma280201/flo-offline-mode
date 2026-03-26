"""
Industry-specific news sources and search query builders
"""

def get_industry_search_query(company_name: str, industry: str) -> str:
    """
    Build industry-specific search query to get more relevant news
    """
    if not industry or industry == "Other":
        return f"Recent news about {company_name}"

    # Industry-specific search terms
    industry_terms = {
        "Technology": f"{company_name} (startup OR funding OR AI OR product launch OR tech)",
        "Construction": f"{company_name} (project OR construction OR infrastructure OR contract)",
        "Manufacturing": f"{company_name} (production OR factory OR manufacturing OR supply chain)",
        "Real Estate": f"{company_name} (property OR real estate OR development OR project)",
        "Healthcare": f"{company_name} (healthcare OR medical OR hospital OR pharma)",
        "Finance": f"{company_name} (investment OR funding OR financial OR bank)",
        "Automotive": f"{company_name} (automotive OR vehicle OR EV OR manufacturing)",
    }

    return industry_terms.get(industry, f"Recent news about {company_name}")


def get_industry_news_sites(industry: str) -> list:
    """
    Return list of industry-specific news sites to prioritize
    These are added as site restrictions in Google search
    """
    if not industry or industry == "Other":
        return []

    industry_sites = {
        "Technology": [
            "site:techcrunch.com",
            "site:yourstory.com",
            "site:inc42.com",
            "site:thenextweb.com",
        ],
        "Construction": [
            "site:constructionweek.in",
            "site:constructionworld.in",
            "site:infraline.com",
        ],
        "Manufacturing": [
            "site:manufacturing.net",
            "site:industryweek.com",
        ],
        "Real Estate": [
            "site:economictimes.indiatimes.com/industry/services/property",
            "site:housing.com/news",
        ],
        "Healthcare": [
            "site:healthcareradiusnews.com",
            "site:expresshealthcare.in",
        ],
        "Finance": [
            "site:economictimes.indiatimes.com/markets",
            "site:moneycontrol.com",
        ],
        "Automotive": [
            "site:autocarpro.in",
            "site:auto.economictimes.indiatimes.com",
        ],
    }

    return industry_sites.get(industry, [])

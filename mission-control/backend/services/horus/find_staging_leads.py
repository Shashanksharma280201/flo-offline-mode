#!/usr/bin/env python3
"""Find leads in staging database"""

from pymongo import MongoClient

# Staging DB
stag_uri = "mongodb://web-stag:Mongo%40flo%23stag1@164.52.221.4:27017/mission-control?authSource=admin&readPreference=primary&directConnection=true&ssl=false"
client = MongoClient(stag_uri)
db = client["mission-control"]
leads = db["leads"]

print("=" * 60)
print("STAGING DATABASE LEADS")
print("=" * 60)

staging_leads = list(leads.find({}, {
    "_id": 1,
    "companyName": 1,
    "linkedinTag": 1,
    "website": 1,
    "twitterHandle": 1,
    "industry": 1
}).limit(10))

if not staging_leads:
    print("No leads found in staging database!")
else:
    for idx, lead in enumerate(staging_leads, 1):
        print(f"\n{idx}. Lead ID: {lead['_id']}")
        print(f"   Company: {lead.get('companyName', 'N/A')}")
        print(f"   LinkedIn: {lead.get('linkedinTag', 'N/A')}")
        print(f"   Website: {lead.get('website', 'NOT SET')}")
        print(f"   Twitter: {lead.get('twitterHandle', 'NOT SET')}")
        print(f"   Industry: {lead.get('industry', 'NOT SET')}")

client.close()

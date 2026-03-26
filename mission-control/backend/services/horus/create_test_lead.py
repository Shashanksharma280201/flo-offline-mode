#!/usr/bin/env python3
"""Create a new test lead for Google"""

import os
from dotenv import load_dotenv
from pymongo import MongoClient
from datetime import datetime

load_dotenv()

# Staging DB
stag_uri = "mongodb://web-stag:Mongo%40flo%23stag1@164.52.221.4:27017/mission-control?authSource=admin&readPreference=primary&directConnection=true&ssl=false"
client = MongoClient(stag_uri)
db = client["mission-control"]
leads = db["leads"]

# Create Google test lead
google_lead = {
    "companyName": "Google",
    "linkedinTag": "google",
    "website": "https://blog.google",
    "industry": "Technology",
    "createdAt": datetime.utcnow(),
    "updatedAt": datetime.utcnow()
}

result = leads.insert_one(google_lead)
lead_id = result.inserted_id

print("=" * 60)
print("✓ TEST LEAD CREATED SUCCESSFULLY!")
print("=" * 60)
print(f"\nLead ID: {lead_id}")
print(f"Company: {google_lead['companyName']}")
print(f"LinkedIn: {google_lead['linkedinTag']}")
print(f"Website: {google_lead['website']}")
print(f"Industry: {google_lead['industry']}")
print(f"\n🧪 Frontend URL: http://localhost:3000/leads/{lead_id}")
print(f"🔌 API URL: http://localhost:9000/horus/{lead_id}")
print("=" * 60)

client.close()

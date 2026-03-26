#!/usr/bin/env python3
"""Update Total Environment lead with new fields for testing"""

import os
from dotenv import load_dotenv
from pymongo import MongoClient
from bson.objectid import ObjectId

load_dotenv()

mongo_uri = os.getenv("MONGO_URI")
client = MongoClient(mongo_uri)
db = client["mission-control"]
leads = db["leads"]

# Update Total Environment lead (ID: 67543f48bdab34354ef44722)
lead_id = ObjectId("67543f48bdab34354ef44722")

update_data = {
    "website": "https://www.totalenvironment.in",
    "industry": "Real Estate"
}

result = leads.update_one(
    {"_id": lead_id},
    {"$set": update_data}
)

if result.modified_count > 0:
    print("✓ Lead updated successfully!")
    print(f"\nCompany: Total Environment")
    print(f"Lead ID: {lead_id}")
    print(f"LinkedIn Tag: total-environment-building-systems")
    print(f"Website: {update_data['website']}")
    print(f"Industry: {update_data['industry']}")
    print(f"Twitter: Not set (optional)")
    print(f"\n🧪 Test URL: http://localhost:5173/leads/{lead_id}")
else:
    print("✗ Update failed or no changes made")

client.close()

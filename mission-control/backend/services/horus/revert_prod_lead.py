#!/usr/bin/env python3
"""Revert production lead changes"""

from pymongo import MongoClient
from bson.objectid import ObjectId

# Production DB
prod_uri = "mongodb://web-prod:Mongo%40flo%23prod23@164.52.207.199:27017/mission-control?authSource=admin"
client = MongoClient(prod_uri)
db = client["mission-control"]
leads = db["leads"]

lead_id = ObjectId("67543f48bdab34354ef44722")

# Remove the fields we added
result = leads.update_one(
    {"_id": lead_id},
    {"$unset": {
        "website": "",
        "industry": ""
    }}
)

if result.modified_count > 0:
    print("✓ Production lead reverted successfully")
    print(f"Removed fields: website, industry from {lead_id}")
else:
    print("✗ No changes made (fields might not exist)")

client.close()

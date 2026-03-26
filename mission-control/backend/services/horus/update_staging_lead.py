#!/usr/bin/env python3
"""Update Google lead in staging database"""

from pymongo import MongoClient
from bson.objectid import ObjectId

# Staging DB
stag_uri = "mongodb://web-stag:Mongo%40flo%23stag1@164.52.221.4:27017/mission-control?authSource=admin&readPreference=primary&directConnection=true&ssl=false"
client = MongoClient(stag_uri)
db = client["mission-control"]
leads = db["leads"]

lead_id = ObjectId("69045eb2847f8f31bbff5f54")

update_data = {
    "website": "https://blog.google",
    "industry": "Technology"
}

result = leads.update_one(
    {"_id": lead_id},
    {"$set": update_data}
)

if result.modified_count > 0:
    print("✓ Staging lead updated successfully!")
    print(f"\nCompany: Google")
    print(f"Lead ID: {lead_id}")
    print(f"LinkedIn Tag: google")
    print(f"Website: {update_data['website']}")
    print(f"Industry: {update_data['industry']}")
    print(f"Twitter: Not set (optional)")
    print(f"\n🧪 Test URL: http://localhost:5173/leads/{lead_id}")
    print(f"API URL: http://localhost:9000/horus/{lead_id}")
else:
    print("✗ Update failed or no changes made")

client.close()

#!/usr/bin/env python3
"""Script to check existing leads and update one for testing"""

import os
from dotenv import load_dotenv
from pymongo import MongoClient
from bson.objectid import ObjectId

# Load environment variables
load_dotenv()

# Connect to MongoDB
mongo_uri = os.getenv("MONGO_URI")
client = MongoClient(mongo_uri)
db = client["mission-control"]
leads_collection = db["leads"]

print("=" * 60)
print("EXISTING LEADS IN DATABASE")
print("=" * 60)

# Find all leads
leads = list(leads_collection.find({}, {
    "_id": 1,
    "companyName": 1,
    "linkedinTag": 1,
    "website": 1,
    "twitterHandle": 1,
    "industry": 1
}).limit(10))

if not leads:
    print("No leads found in database!")
else:
    for idx, lead in enumerate(leads, 1):
        print(f"\n{idx}. Lead ID: {lead['_id']}")
        print(f"   Company: {lead.get('companyName', 'N/A')}")
        print(f"   LinkedIn: {lead.get('linkedinTag', 'N/A')}")
        print(f"   Website: {lead.get('website', 'NOT SET')}")
        print(f"   Twitter: {lead.get('twitterHandle', 'NOT SET')}")
        print(f"   Industry: {lead.get('industry', 'NOT SET')}")

    # Ask which lead to update
    print("\n" + "=" * 60)
    print("SELECT LEAD TO UPDATE FOR TESTING")
    print("=" * 60)

    choice = input(f"\nEnter number (1-{len(leads)}) to update, or 0 to exit: ")

    if choice.isdigit() and 1 <= int(choice) <= len(leads):
        selected_lead = leads[int(choice) - 1]
        lead_id = selected_lead["_id"]
        company_name = selected_lead.get("companyName", "Unknown")

        print(f"\nUpdating lead: {company_name} (ID: {lead_id})")

        # Ask for details
        website = input("Enter website URL (e.g., https://blog.google): ").strip()
        twitter = input("Enter Twitter/X handle (e.g., @Google or Google): ").strip()

        print("\nAvailable industries:")
        industries = ["Technology", "Construction", "Manufacturing", "Real Estate",
                     "Healthcare", "Finance", "Automotive", "Other"]
        for i, ind in enumerate(industries, 1):
            print(f"{i}. {ind}")

        ind_choice = input(f"Select industry (1-{len(industries)}): ").strip()
        industry = industries[int(ind_choice) - 1] if ind_choice.isdigit() and 1 <= int(ind_choice) <= len(industries) else "Other"

        # Update the lead
        update_data = {}
        if website:
            update_data["website"] = website
        if twitter:
            update_data["twitterHandle"] = twitter
        if industry:
            update_data["industry"] = industry

        if update_data:
            result = leads_collection.update_one(
                {"_id": ObjectId(lead_id)},
                {"$set": update_data}
            )

            if result.modified_count > 0:
                print("\n" + "=" * 60)
                print("✓ LEAD UPDATED SUCCESSFULLY!")
                print("=" * 60)
                print(f"\nTest URL: http://localhost:5173/leads/{lead_id}")
                print(f"API Endpoint: http://localhost:9000/horus/{lead_id}")
                print(f"\nUpdated fields:")
                for key, value in update_data.items():
                    print(f"  - {key}: {value}")
            else:
                print("\n✗ No changes made (values might be the same)")
        else:
            print("\n✗ No data to update")
    elif choice == "0":
        print("\nExiting...")
    else:
        print("\nInvalid choice!")

client.close()

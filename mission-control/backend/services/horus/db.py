import time
from config import settings
from pymongo import MongoClient
from bson.objectid import ObjectId

uri = settings.mongo_uri
mongo_client = MongoClient(uri)

def fetch_lead_info(lead_id: str):
    try:
        database = mongo_client.get_database("mission-control")
        leads = database.get_collection("leads")
        query = {"_id": ObjectId(lead_id)}
        lead = leads.find_one(query, {
            "linkedinTag": 1,
            "companyName": 1,
            "website": 1,
            "twitterHandle": 1,
            "industry": 1,
            "_id": 0
        })

        return lead
    except Exception as e:
        print(f"Error fetching lead info: {e}")
        return None

def add_summary_to_lead(summary, company_name):
    try:
        database = mongo_client.get_database("mission-control")
        leads = database.get_collection("leads")
        query = {"companyName": company_name}
        current_time = time.time()

        update = {"$set": {"news": {
            "summary": summary, 
            "timestamp": current_time*1000
        }}}
        
        leads.update_many(query, update)
    except Exception as e:
        print(f"Error adding summary to lead: {e}")
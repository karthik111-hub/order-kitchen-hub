#!/usr/bin/env python3
"""
Quick script to check what's in MongoDB for menu items
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

async def check_db():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Get latest menu items
    items = await db.menu_items.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    print(f"\n=== Latest 5 items in MongoDB ===\n")
    for i, item in enumerate(items, 1):
        print(f"Item {i}:")
        print(f"  name: {item.get('name')}")
        print(f"  price: {item.get('price')}")
        print(f"  old_price: {item.get('old_price')} (exists: {'old_price' in item})")
        print(f"  category: {item.get('category')}")
        print(f"  Full item keys: {list(item.keys())}")
        print()
    
    client.close()

asyncio.run(check_db())

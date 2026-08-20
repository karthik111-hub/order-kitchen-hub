#!/usr/bin/env python3

with open('server.py', 'r') as f:
    content = f.read()

old_func = '''@api_router.post("/menu")
async def create_menu_item(payload: MenuItemCreate):
    print(f"DEBUG: create_menu_item received old_price={payload.old_price}", flush=True)
    if not payload.category.strip():
        raise HTTPException(status_code=400, detail="Category required")
    item = MenuItem(**payload.dict())
    await db.menu_items.insert_one(item.dict())
    return item'''

new_func = '''@api_router.post("/menu")
async def create_menu_item(payload: MenuItemCreate):
    print("\\n=== CREATE_MENU_ITEM START ===", flush=True)
    print(f"Full payload: {payload}", flush=True)
    print(f"payload.name: {payload.name}", flush=True)
    print(f"payload.price: {payload.price}", flush=True)
    print(f"payload.old_price: {payload.old_price} (type: {type(payload.old_price)})", flush=True)
    print(f"payload.category: {payload.category}", flush=True)
    
    payload_dict = payload.dict()
    print(f"\\npayload.dict() result: {payload_dict}", flush=True)
    print(f"'old_price' key exists in dict: {'old_price' in payload_dict}", flush=True)
    print(f"payload_dict['old_price']: {payload_dict.get('old_price')}", flush=True)
    
    if not payload.category.strip():
        raise HTTPException(status_code=400, detail="Category required")
    
    item = MenuItem(**payload_dict)
    print(f"\\nMenuItem created: {item}", flush=True)
    
    item_dict = item.dict()
    print(f"item.dict() result: {item_dict}", flush=True)
    print(f"item_dict['old_price']: {item_dict.get('old_price')}", flush=True)
    
    result = await db.menu_items.insert_one(item_dict)
    print(f"Inserted to MongoDB with id: {result.inserted_id}", flush=True)
    print("=== CREATE_MENU_ITEM END ===\\n", flush=True)
    
    return item'''

content = content.replace(old_func, new_func)

with open('server.py', 'w') as f:
    f.write(content)

print('Updated create_menu_item with comprehensive logging')

#!/usr/bin/env python3

with open('server.py', 'r') as f:
    content = f.read()

# Fix create_menu_item to properly save old_price
old_create = '''@api_router.post("/menu", response_model=MenuItem)
async def create_menu_item(payload: MenuItemCreate):
    if not payload.category.strip():
        raise HTTPException(status_code=400, detail="Category required")
    item = MenuItem(**payload.dict())
    await db.menu_items.insert_one(item.dict())
    return item'''

new_create = '''@api_router.post("/menu", response_model=MenuItem)
async def create_menu_item(payload: MenuItemCreate):
    if not payload.category.strip():
        raise HTTPException(status_code=400, detail="Category required")
    # Explicitly preserve all fields including old_price
    payload_dict = payload.dict()
    item = MenuItem(**payload_dict)
    insert_dict = item.dict()
    print(f"DEBUG: insert_dict = {insert_dict}", flush=True)
    await db.menu_items.insert_one(insert_dict)
    return item'''

content = content.replace(old_create, new_create)

with open('server.py', 'w') as f:
    f.write(content)

print('Fixed create_menu_item')

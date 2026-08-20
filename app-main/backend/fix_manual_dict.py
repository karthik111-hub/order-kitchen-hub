#!/usr/bin/env python3

with open('server.py', 'r') as f:
    content = f.read()

old = '''@api_router.post("/menu")
async def create_menu_item(payload: MenuItemCreate):
    if not payload.category.strip():
        raise HTTPException(status_code=400, detail="Category required")
    
    item = MenuItem(**payload.dict())
    item_dict = item.dict(exclude_none=False)
    
    await db.menu_items.insert_one(item_dict)
    return item'''

new = '''@api_router.post("/menu")
async def create_menu_item(payload: MenuItemCreate):
    if not payload.category.strip():
        raise HTTPException(status_code=400, detail="Category required")
    
    item = MenuItem(**payload.dict())
    # FORCE include old_price by manually building dict
    item_dict = {
        "id": item.id,
        "name": item.name,
        "price": item.price,
        "old_price": item.old_price,
        "category": item.category,
        "tag": item.tag,
        "image_base64": item.image_base64,
        "is_available": item.is_available,
        "created_at": item.created_at,
    }
    
    await db.menu_items.insert_one(item_dict)
    return item'''

content = content.replace(old, new)

with open('server.py', 'w') as f:
    f.write(content)

print('Fixed: now manually building dict to force include old_price')

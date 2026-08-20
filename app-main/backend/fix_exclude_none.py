#!/usr/bin/env python3

with open('server.py', 'r') as f:
    content = f.read()

# Fix: Change item.dict() to item.dict(exclude_none=False) in create_menu_item
old_code = '''    item = MenuItem(**payload_dict)
    logger.info(f"MenuItem created: {item}")
    
    item_dict = item.dict()
    logger.info(f"item.dict() result: {item_dict}")
    logger.info(f"item_dict['old_price']: {item_dict.get('old_price')}")
    
    result = await db.menu_items.insert_one(item_dict)'''

new_code = '''    item = MenuItem(**payload_dict)
    logger.info(f"MenuItem created: {item}")
    
    item_dict = item.dict(exclude_none=False)
    logger.info(f"item.dict(exclude_none=False) result: {item_dict}")
    logger.info(f"item_dict['old_price']: {item_dict.get('old_price')}")
    
    result = await db.menu_items.insert_one(item_dict)'''

content = content.replace(old_code, new_code)

with open('server.py', 'w') as f:
    f.write(content)

print('Fixed: Changed item.dict() to item.dict(exclude_none=False)')

#!/usr/bin/env python3

with open('server.py', 'r') as f:
    content = f.read()

# Replace print statements with logger.info
content = content.replace('print("\\n=== CREATE_MENU_ITEM START ===", flush=True)', 'logger.info("=== CREATE_MENU_ITEM START ===")')
content = content.replace('print(f"Full payload: {payload}", flush=True)', 'logger.info(f"Full payload: {payload}")')
content = content.replace('print(f"payload.name: {payload.name}", flush=True)', 'logger.info(f"payload.name: {payload.name}")')
content = content.replace('print(f"payload.price: {payload.price}", flush=True)', 'logger.info(f"payload.price: {payload.price}")')
content = content.replace('print(f"payload.old_price: {payload.old_price} (type: {type(payload.old_price)})", flush=True)', 'logger.info(f"payload.old_price: {payload.old_price} (type: {type(payload.old_price)})")')
content = content.replace('print(f"payload.category: {payload.category}", flush=True)', 'logger.info(f"payload.category: {payload.category}")')
content = content.replace('print(f"\\npayload.dict() result: {payload_dict}", flush=True)', 'logger.info(f"payload.dict() result: {payload_dict}")')
content = content.replace('print(f"\'old_price\' key exists in dict: {\'old_price\' in payload_dict}", flush=True)', 'logger.info(f"\'old_price\' key exists in dict: {\'old_price\' in payload_dict}")')
content = content.replace('print(f"payload_dict[\'old_price\']: {payload_dict.get(\'old_price\')}", flush=True)', 'logger.info(f"payload_dict[\'old_price\']: {payload_dict.get(\'old_price\')}")')
content = content.replace('print(f"\\nMenuItem created: {item}", flush=True)', 'logger.info(f"MenuItem created: {item}")')
content = content.replace('print(f"item.dict() result: {item_dict}", flush=True)', 'logger.info(f"item.dict() result: {item_dict}")')
content = content.replace('print(f"item_dict[\'old_price\']: {item_dict.get(\'old_price\')}", flush=True)', 'logger.info(f"item_dict[\'old_price\']: {item_dict.get(\'old_price\')}")')
content = content.replace('print(f"Inserted to MongoDB with id: {result.inserted_id}", flush=True)', 'logger.info(f"Inserted to MongoDB with id: {result.inserted_id}")')
content = content.replace('print("=== CREATE_MENU_ITEM END ===\\n", flush=True)', 'logger.info("=== CREATE_MENU_ITEM END ===")')

with open('server.py', 'w') as f:
    f.write(content)

print('Replaced print() with logger.info()')

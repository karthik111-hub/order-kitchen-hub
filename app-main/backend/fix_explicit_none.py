#!/usr/bin/env python3

with open('server.py', 'r') as f:
    lines = f.readlines()

new_lines = []
i = 0
while i < len(lines):
    if '@api_router.post("/menu")' in lines[i] and i+1 < len(lines) and 'async def create_menu_item' in lines[i+1]:
        # Found the route
        new_lines.append(lines[i])  # decorator
        new_lines.append(lines[i+1])  # async def
        i += 2
        
        # Add the new function body
        new_lines.append('    if not payload.category.strip():\n')
        new_lines.append('        raise HTTPException(status_code=400, detail="Category required")\n')
        new_lines.append('    \n')
        new_lines.append('    item = MenuItem(**payload.dict())\n')
        new_lines.append('    # Convert to dict and ensure old_price is included even if None\n')
        new_lines.append('    item_dict = item.dict()\n')
        new_lines.append('    # Explicitly set old_price in the dict (MongoDB will store null)\n')
        new_lines.append('    item_dict["old_price"] = item.old_price\n')
        new_lines.append('    \n')
        new_lines.append('    await db.menu_items.insert_one(item_dict)\n')
        new_lines.append('    return item\n')
        
        # Skip old function body
        while i < len(lines) and not lines[i].startswith('@api_router'):
            i += 1
    else:
        new_lines.append(lines[i])
        i += 1

with open('server.py', 'w') as f:
    f.writelines(new_lines)

print('Updated create_menu_item with explicit dict assignment')

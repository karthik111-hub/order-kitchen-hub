#!/usr/bin/env python3

with open('server.py', 'r') as f:
    lines = f.readlines()

# Find and replace create_menu_item
new_lines = []
skip_until_return = False
i = 0

while i < len(lines):
    if '@api_router.post("/menu", response_model=MenuItem)' in lines[i]:
        # Skip the decorator line
        i += 1
        
        # Add new decorator without response_model
        new_lines.append('@api_router.post("/menu")\n')
        
        # Copy the async def line
        new_lines.append(lines[i])
        i += 1
        
        # Add function body
        new_lines.append('    if not payload.category.strip():\n')
        new_lines.append('        raise HTTPException(status_code=400, detail="Category required")\n')
        new_lines.append('    payload_dict = payload.dict()\n')
        new_lines.append('    item = MenuItem(**payload_dict)\n')
        new_lines.append('    insert_dict = item.dict()\n')
        new_lines.append('    print(f"DEBUG: insert_dict with old_price = {insert_dict}", flush=True)\n')
        new_lines.append('    await db.menu_items.insert_one(insert_dict)\n')
        new_lines.append('    result_dict = item.dict(exclude_none=False)\n')
        new_lines.append('    print(f"DEBUG: response dict with old_price = {result_dict}", flush=True)\n')
        new_lines.append('    return result_dict\n')
        
        # Skip the old function body until we reach the next @api_router
        while i < len(lines) and not lines[i].startswith('@api_router'):
            i += 1
    else:
        new_lines.append(lines[i])
        i += 1

with open('server.py', 'w') as f:
    f.writelines(new_lines)

print('Fixed create_menu_item to return dict without response_model constraint')

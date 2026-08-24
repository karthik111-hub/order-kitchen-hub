#!/usr/bin/env python3
import os
os.chdir('app-main/backend')

with open('server.py', 'r') as f:
    content = f.read()

# Replace the problematic line
old = 'items = await db.menu_items.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)\n    return [MenuItem(**it) for it in items]'
new = 'items = await db.menu_items.find(query, {"_id": 0}).to_list(1000)\n    # Sort in Python to avoid MongoDB memory limit with large base64 images\n    items_sorted = sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)\n    return [MenuItem(**it) for it in items_sorted]'

if old in content:
    content = content.replace(old, new)
    with open('server.py', 'w') as f:
        f.write(content)
    print("Fixed MongoDB sort issue")
else:
    print("Could not find the line - trying alternative search")
    if 'items = await db.menu_items.find(query, {"_id": 0}).sort' in content:
        print("Found the line pattern, manual replacement needed")

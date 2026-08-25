import re

with open('app-main/backend/server.py', 'r') as f:
    content = f.read()

# Replace the problematic MongoDB sort line
old_pattern = r'items = await db\.menu_items\.find\(query, \{"_id": 0\}\)\.sort\("created_at", -1\)\.to_list\(1000\)\s+return \[MenuItem\(\*\*it\) for it in items\]'
new_code = '''items = await db.menu_items.find(query, {"_id": 0}).to_list(1000)
    items_sorted = sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)
    return [MenuItem(**it) for it in items_sorted]'''

content = re.sub(old_pattern, new_code, content)

with open('app-main/backend/server.py', 'w') as f:
    f.write(content)

print("Fixed MongoDB sort issue")

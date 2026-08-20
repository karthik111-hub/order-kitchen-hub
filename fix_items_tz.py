import re

filepath = 'app-main/frontend/app/admin/items.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# Fix 1: Replace the old validation code
old_pattern = r'    try \{\s+setSaving\(true\);\s+const oldPriceNum = oldPrice && oldPrice\.trim\(\) \? parseFloat\(oldPrice\) : null;'
new_code = '''    const oldPriceNum = parseFloat(oldPrice);
    if (isNaN(oldPriceNum) || oldPriceNum < 0) {
      Alert.alert('Invalid old price', 'Enter a valid old price.');
      return;
    }
    try {
      setSaving(true);'''

content = re.sub(old_pattern, new_code, content)

# Fix 2: Remove optional chaining
content = content.replace('setOldPrice(item.old_price?.toString());', 'setOldPrice(item.old_price.toString());')

with open(filepath, 'w') as f:
    f.write(content)

print('Fixed items.tsx!')

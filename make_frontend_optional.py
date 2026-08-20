import re

with open('app-main/frontend/app/admin/items.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace old_price validation - make it optional
old_validation = """    const oldPriceNum = parseFloat(oldPrice);
    if (isNaN(oldPriceNum) || oldPriceNum < 0) {
      Alert.alert('Invalid old price', 'Enter a valid old price.');
      return;
    }"""

new_validation = """    // old_price is optional - only validate if provided
    const oldPriceNum = oldPrice && oldPrice.trim() ? parseFloat(oldPrice) : null;
    if (oldPriceNum !== null && (isNaN(oldPriceNum) || oldPriceNum < 0)) {
      Alert.alert('Invalid old price', 'Enter a valid old price if provided.');
      return;
    }"""

content = content.replace(old_validation, new_validation)

# Also fix the placeholder to indicate it's optional
content = content.replace(
    'placeholder="Old price"',
    'placeholder="Old price (optional)"'
)

with open('app-main/frontend/app/admin/items.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Made old_price optional in frontend form')

import re

with open('app-main/frontend/app/admin/items.tsx', 'r') as f:
    content = f.read()

# Replace the save function validation for old_price
old_section = """    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert('Invalid price', 'Enter a valid price.');
      return;
    }
    try {
      setSaving(true);
      const oldPriceNum = oldPrice && oldPrice.trim() ? parseFloat(oldPrice) : null;"""

new_section = """    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert('Invalid price', 'Enter a valid price.');
      return;
    }
    const oldPriceNum = parseFloat(oldPrice);
    if (isNaN(oldPriceNum) || oldPriceNum < 0) {
      Alert.alert('Invalid old price', 'Enter a valid old price.');
      return;
    }
    try {
      setSaving(true);"""

content = content.replace(old_section, new_section)

# Fix openEditForm to not use optional chaining for old_price
old_edit = "    setOldPrice(item.old_price?.toString());"
new_edit = "    setOldPrice(item.old_price.toString());"
content = content.replace(old_edit, new_edit)

with open('app-main/frontend/app/admin/items.tsx', 'w') as f:
    f.write(content)

print("Fixed: old_price validation and openEditForm")

#!/usr/bin/env python3

with open('items.tsx', 'r') as f:
    content = f.read()

# 1. Add old_price state
content = content.replace(
    '  const [price, setPrice] = useState(\'\');',
    '  const [price, setPrice] = useState(\'\');\n  const [oldPrice, setOldPrice] = useState(\'\');',
    1
)

# 2. Reset in openForm
content = content.replace(
    '    setPrice(\'\');\n    setImageBase64(null);',
    '    setPrice(\'\');\n    setOldPrice(\'\');\n    setImageBase64(null);',
    1
)

# 3. Load in openEditForm
content = content.replace(
    '    setPrice(item.price.toString());\n    setImageBase64(item.image_base64 || null);',
    '    setPrice(item.price.toString());\n    setOldPrice(item.old_price?.toString() || \'\');\n    setImageBase64(item.image_base64 || null);',
    1
)

# 4. Add to save function before editingItem check
old_save = '''    try {
      setSaving(true);
      
      if (editingItem) {'''

new_save = '''    try {
      setSaving(true);
      const oldPriceNum = oldPrice ? parseFloat(oldPrice) : undefined;
      
      if (editingItem) {'''

content = content.replace(old_save, new_save)

# 5. Add old_price to updateMenuItem call
content = content.replace(
    '''        await api.updateMenuItem(editingItem.id, {
          name: name.trim(),
          price: priceNum,
          tag,''',
    '''        await api.updateMenuItem(editingItem.id, {
          name: name.trim(),
          price: priceNum,
          old_price: oldPriceNum,
          tag,'''
)

# 6. Add old_price to createMenuItem call
content = content.replace(
    '''        await api.createMenuItem({
          name: name.trim(),
          price: priceNum,
          category: selectedCat,''',
    '''        await api.createMenuItem({
          name: name.trim(),
          price: priceNum,
          old_price: oldPriceNum,
          category: selectedCat,'''
)

# 7. Add TextInput for old_price after price input
old_input = '''            <TextInput
              testID="admin-item-price-input"
              placeholder="Price"
              placeholderTextColor={colors.muted}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              style={styles.input}
            />

            <Text style={styles.tagLabel}>Highlight tag (optional)</Text>'''

new_input = '''            <TextInput
              testID="admin-item-price-input"
              placeholder="Price"
              placeholderTextColor={colors.muted}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <TextInput
              testID="admin-item-old-price-input"
              placeholder="Old price (optional)"
              placeholderTextColor={colors.muted}
              value={oldPrice}
              onChangeText={setOldPrice}
              keyboardType="decimal-pad"
              style={styles.input}
            />

            <Text style={styles.tagLabel}>Highlight tag (optional)</Text>'''

content = content.replace(old_input, new_input)

with open('items.tsx', 'w') as f:
    f.write(content)

print('Updated items.tsx successfully')

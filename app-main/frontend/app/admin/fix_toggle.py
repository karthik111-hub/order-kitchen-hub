#!/usr/bin/env python3

with open('items.tsx', 'r') as f:
    content = f.read()

# Fix toggleAvailability to include old_price
old = '''      await api.updateMenuItem(item.id, {
        name: item.name,
        price: item.price,
        tag: item.tag,
        image_base64: item.image_base64,
        is_available: !item.is_available,
      });'''

new = '''      await api.updateMenuItem(item.id, {
        name: item.name,
        price: item.price,
        old_price: item.old_price,
        tag: item.tag,
        image_base64: item.image_base64,
        is_available: !item.is_available,
      });'''

content = content.replace(old, new)

with open('items.tsx', 'w') as f:
    f.write(content)

print('Fixed toggleAvailability to include old_price')

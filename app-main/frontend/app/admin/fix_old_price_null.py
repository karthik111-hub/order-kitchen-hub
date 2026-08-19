#!/usr/bin/env python3

with open('items.tsx', 'r') as f:
    content = f.read()

# Fix: change undefined to null
old = '''      const oldPriceNum = oldPrice ? parseFloat(oldPrice) : undefined;'''
new = '''      const oldPriceNum = oldPrice && oldPrice.trim() ? parseFloat(oldPrice) : null;'''

content = content.replace(old, new)

with open('items.tsx', 'w') as f:
    f.write(content)

print('Fixed oldPrice to use null instead of undefined')

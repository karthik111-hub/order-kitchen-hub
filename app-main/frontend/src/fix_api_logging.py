#!/usr/bin/env python3

with open('api.ts', 'r') as f:
    content = f.read()

# Add logging to createMenuItem
old = '''  createMenuItem: (body: {
    name: string;
    price: number;
    old_price?: number | null;
    category: string;
    tag?: ItemTag | null;
    image_base64?: string | null;
  }) =>
    fetch(`${API}/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => handle<MenuItem>(r)),'''

new = '''  createMenuItem: (body: {
    name: string;
    price: number;
    old_price?: number | null;
    category: string;
    tag?: ItemTag | null;
    image_base64?: string | null;
  }) => {
    const bodyStr = JSON.stringify(body);
    console.log('[NETWORK] POST /menu body:', bodyStr);
    console.log('[NETWORK] old_price field:', body.old_price, 'type:', typeof body.old_price);
    return fetch(`${API}/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr,
    }).then(r => handle<MenuItem>(r));
  },'''

content = content.replace(old, new)

with open('api.ts', 'w') as f:
    f.write(content)

print('Added network logging to createMenuItem')

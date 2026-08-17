#!/usr/bin/env python3

path = "./server.py"
with open(path, 'r') as f:
    content = f.read()

# Replace in create_order
old = 'token_number = await get_next_token_number()\n        order = Order(\n            token_number=token_number,'
new = 'token_number = await get_next_token_number()\n        now = datetime.now(timezone.utc)\n        order_number = f"{now:%d%m%Y}{token_number}"\n        order = Order(\n            token_number=token_number,\n            order_number=order_number,'

content = content.replace(old, new)

# Replace in rzp_finalize
old2 = 'total = sum(i["price"] * i["quantity"] for i in intent["items"])\n    token_number = await get_next_token_number()\n    order = Order(\n        token_number=token_number,'
new2 = 'total = sum(i["price"] * i["quantity"] for i in intent["items"])\n    token_number = await get_next_token_number()\n    now = datetime.now(timezone.utc)\n    order_number = f"{now:%d%m%Y}{token_number}"\n    order = Order(\n        token_number=token_number,\n        order_number=order_number,'

content = content.replace(old2, new2)

with open(path, 'w') as f:
    f.write(content)
    
print("Done updating server.py")

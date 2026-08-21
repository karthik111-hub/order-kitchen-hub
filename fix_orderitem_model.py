with open('app-main/backend/server.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix OrderItem old_price to be optional
old = '''class OrderItem(BaseModel):
    menu_item_id: str
    name: str
    price: float
    old_price: float
    quantity: int
    image_base64: Optional[str] = None'''

new = '''class OrderItem(BaseModel):
    menu_item_id: str
    name: str
    price: float
    old_price: Optional[float] = None
    quantity: int
    image_base64: Optional[str] = None'''

content = content.replace(old, new)

with open('app-main/backend/server.py', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed OrderItem old_price to be optional')

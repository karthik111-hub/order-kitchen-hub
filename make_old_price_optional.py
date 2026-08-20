import re

with open('app-main/backend/server.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace MenuItem class - make old_price optional
content = re.sub(
    r'class MenuItem\(BaseModel\):\s+id: str = Field.*?\n\s+name: str\n\s+price: float\n\s+old_price: float',
    'class MenuItem(BaseModel):\n    id: str = Field(default_factory=lambda: str(uuid.uuid4()))\n    name: str\n    price: float\n    old_price: Optional[float] = None',
    content
)

# Replace MenuItemCreate class
content = re.sub(
    r'class MenuItemCreate\(BaseModel\):\s+name: str\n\s+price: float\n\s+old_price: float',
    'class MenuItemCreate(BaseModel):\n    name: str\n    price: float\n    old_price: Optional[float] = None',
    content
)

# Replace MenuItemUpdate class
content = re.sub(
    r'class MenuItemUpdate\(BaseModel\):\s+name: str\n\s+price: float\n\s+old_price: float',
    'class MenuItemUpdate(BaseModel):\n    name: str\n    price: float\n    old_price: Optional[float] = None',
    content
)

with open('app-main/backend/server.py', 'w', encoding='utf-8') as f:
    f.write(content)

print('Made old_price optional in all models')

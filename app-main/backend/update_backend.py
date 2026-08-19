#!/usr/bin/env python3

with open('server.py', 'r') as f:
    lines = f.readlines()

# Find MenuItem class and add old_price
new_lines = []
i = 0
while i < len(lines):
    if 'class MenuItem(BaseModel):' in lines[i]:
        new_lines.append(lines[i])
        i += 1
        # Copy until we find 'price: float'
        while i < len(lines) and 'price: float' not in lines[i]:
            new_lines.append(lines[i])
            i += 1
        new_lines.append(lines[i])  # Add 'price: float'
        new_lines.append('    old_price: Optional[float] = None\n')
        i += 1
    elif 'class MenuItemCreate(BaseModel):' in lines[i]:
        new_lines.append(lines[i])
        i += 1
        while i < len(lines) and 'price: float' not in lines[i]:
            new_lines.append(lines[i])
            i += 1
        new_lines.append(lines[i])  # Add 'price: float'
        new_lines.append('    old_price: Optional[float] = None\n')
        i += 1
    elif 'class MenuItemUpdate(BaseModel):' in lines[i]:
        new_lines.append(lines[i])
        i += 1
        while i < len(lines) and 'price: float' not in lines[i]:
            new_lines.append(lines[i])
            i += 1
        new_lines.append(lines[i])  # Add 'price: float'
        new_lines.append('    old_price: Optional[float] = None\n')
        i += 1
    elif '"price": payload.price,' in lines[i]:
        new_lines.append(lines[i])
        new_lines.append('        "old_price": payload.old_price,\n')
        i += 1
    else:
        new_lines.append(lines[i])
        i += 1

with open('server.py', 'w') as f:
    f.writelines(new_lines)

print('Backend updated with old_price field')

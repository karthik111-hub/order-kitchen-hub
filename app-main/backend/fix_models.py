#!/usr/bin/env python3

with open('server.py', 'r') as f:
    lines = f.readlines()

# Find and fix the three models
output = []
i = 0

while i < len(lines):
    line = lines[i]
    
    # Fix MenuItem model
    if 'class MenuItem(BaseModel):' in line:
        output.append(line)
        i += 1
        # Copy lines until we hit old_price: float
        while i < len(lines):
            if 'old_price: float' in lines[i]:
                output.append('    old_price: Optional[float] = None\n')
                i += 1
                break
            else:
                output.append(lines[i])
                i += 1
    
    # Fix MenuItemCreate model
    elif 'class MenuItemCreate(BaseModel):' in line:
        output.append(line)
        i += 1
        # Copy lines until we hit old_price: float
        while i < len(lines):
            if 'old_price: float' in lines[i]:
                output.append('    old_price: Optional[float] = None\n')
                i += 1
                break
            else:
                output.append(lines[i])
                i += 1
    
    # Fix MenuItemUpdate model
    elif 'class MenuItemUpdate(BaseModel):' in line:
        output.append(line)
        i += 1
        # Copy lines until we hit old_price: float
        while i < len(lines):
            if 'old_price: float' in lines[i]:
                output.append('    old_price: Optional[float] = None\n')
                i += 1
                break
            else:
                output.append(lines[i])
                i += 1
    
    # Add debug logging to create_menu_item
    elif 'async def create_menu_item(payload: MenuItemCreate):' in line:
        output.append(line)
        i += 1
        output.append('    print(f"DEBUG: create_menu_item received old_price={payload.old_price}", flush=True)\n')
    
    # Fix update_menu_item to handle None old_price
    elif '    update_dict = {' in line and i > 0 and 'update_menu_item' in ''.join(lines[max(0,i-5):i]):
        output.append(line)
        i += 1
        # Skip old lines, add new ones
        while i < len(lines) and '    }' not in lines[i]:
            if 'old_price' in lines[i]:
                # Skip the old line
                i += 1
            else:
                output.append(lines[i])
                i += 1
        # Add fixed old_price handling
        output.append('        "old_price": payload.old_price,\n')
        output.append(lines[i])  # Add the closing }
        i += 1
    else:
        output.append(line)
        i += 1

with open('server.py', 'w') as f:
    f.writelines(output)

print('Fixed MenuItem, MenuItemCreate, MenuItemUpdate models and added debug logging')

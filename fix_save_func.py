import re

filepath = 'app-main/frontend/app/admin/items.tsx'
with open(filepath, 'r') as f:
    lines = f.readlines()

# Find the save function and fix it
new_lines = []
i = 0
while i < len(lines):
    if 'const priceNum = parseFloat(price);' in lines[i]:
        # Add price validation
        new_lines.append(lines[i])  # const priceNum = parseFloat(price);
        i += 1
        new_lines.append(lines[i])  # if (isNaN(priceNum) || priceNum < 0) {
        i += 1
        new_lines.append(lines[i])  # Alert.alert...
        i += 1
        new_lines.append(lines[i])  # return;
        i += 1
        new_lines.append(lines[i])  # }
        i += 1
        
        # NOW add old_price validation BEFORE try block
        new_lines.append('    const oldPriceNum = parseFloat(oldPrice);\n')
        new_lines.append('    if (isNaN(oldPriceNum) || oldPriceNum < 0) {\n')
        new_lines.append('      Alert.alert(\'Invalid old price\', \'Enter a valid old price.\');\n')
        new_lines.append('      return;\n')
        new_lines.append('    }\n')
        
        # Skip any blank lines or old const oldPriceNum if it exists
        while i < len(lines) and (lines[i].strip() == '' or 'const oldPriceNum' in lines[i]):
            i += 1
    else:
        new_lines.append(lines[i])
        i += 1

with open(filepath, 'w') as f:
    f.writelines(new_lines)

print('Fixed save function!')

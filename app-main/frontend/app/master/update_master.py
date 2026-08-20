#!/usr/bin/env python3

# Update master/index.tsx to show old_price

with open('index.tsx', 'r') as f:
    content = f.read()

# 1. Update rowBottom section to show old_price
old_row_bottom = '''          <View style={styles.rowBottom}>
            <Text style={styles.rowPrice}>₹{item.price.toFixed(0)}</Text>'''

new_row_bottom = '''          <View style={styles.rowBottom}>
            <View>
              {item.old_price && (
                <Text style={styles.rowOldPrice}>₹{item.old_price.toFixed(0)}</Text>
              )}
              <Text style={styles.rowPrice}>₹{item.price.toFixed(0)}</Text>
            </View>'''

content = content.replace(old_row_bottom, new_row_bottom)

# 2. Add rowOldPrice style after rowPrice
old_style = '''  rowPrice: { fontSize: type.lg, fontWeight: '800', color: colors.onSurface },'''

new_style = '''  rowPrice: { fontSize: type.lg, fontWeight: '800', color: colors.onSurface },
  rowOldPrice: { 
    fontSize: type.sm, 
    color: colors.muted, 
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },'''

content = content.replace(old_style, new_style)

with open('index.tsx', 'w') as f:
    f.write(content)

print('Updated master/index.tsx')

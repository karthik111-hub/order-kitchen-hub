#!/usr/bin/env python3

with open('index.tsx', 'r') as f:
    content = f.read()

# Replace the rowBottom section to show old_price above current price
old = '''          <View style={styles.rowBottom}>
            <Text style={styles.rowPrice}>₹{item.price.toFixed(0)}</Text>'''

new = '''          <View style={styles.rowBottom}>
            <View>
              {item.old_price && (
                <Text style={styles.rowOldPrice}>₹{item.old_price.toFixed(0)}</Text>
              )}
              <Text style={styles.rowPrice}>₹{item.price.toFixed(0)}</Text>
            </View>'''

content = content.replace(old, new)

with open('index.tsx', 'w') as f:
    f.write(content)

print('Fixed master/index.tsx')

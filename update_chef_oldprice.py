import re

# Update chef pending to show old_price
with open('app-main/frontend/app/chef/pending.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add old_price display in order items
old_items = '''                {order.items.map((item, idx) => (
                    <View key={idx} style={styles.orderItem}>
                      <Text style={styles.itemQty}>{item.quantity}×</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemPrice}>₹{item.price.toFixed(2)}</Text>
                      </View>
                    </View>
                  ))}'''

new_items = '''                {order.items.map((item, idx) => (
                    <View key={idx} style={styles.orderItem}>
                      <Text style={styles.itemQty}>{item.quantity}×</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        {item.old_price && item.old_price > item.price && (
                          <Text style={styles.itemOldPrice}>₹{item.old_price.toFixed(2)}</Text>
                        )}
                        <Text style={styles.itemPrice}>₹{item.price.toFixed(2)}</Text>
                      </View>
                    </View>
                  ))}'''

content = content.replace(old_items, new_items)

# Add itemOldPrice style
old_price_style = '''  itemPrice: {
    fontSize: type.sm,
    color: colors.muted,
    marginTop: 2,
  },
  notesSection: {'''

new_price_style = '''  itemPrice: {
    fontSize: type.sm,
    color: colors.muted,
    marginTop: 2,
  },
  itemOldPrice: {
    fontSize: type.xs,
    color: colors.muted,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  notesSection: {'''

content = content.replace(old_price_style, new_price_style)

with open('app-main/frontend/app/chef/pending.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated chef pending to show old_price')

# Also update preparing if it has the same structure
with open('app-main/frontend/app/chef/preparing.tsx', 'r', encoding='utf-8') as f:
    prep_content = f.read()

if 'order.items.map' in prep_content:
    prep_content = prep_content.replace(old_items, new_items)
    prep_content = prep_content.replace(old_price_style, new_price_style)
    
    with open('app-main/frontend/app/chef/preparing.tsx', 'w', encoding='utf-8') as f:
        f.write(prep_content)
    
    print('Updated chef preparing to show old_price')

import re

# Fix master menu
with open('app-main/frontend/app/master/index.tsx', 'r', encoding='utf-8') as f:
    master_content = f.read()

# Update renderRow in master to show old_price
old_render = r'<View style=\{styles\.rowBottom\}>\s*<Text style=\{styles\.rowPrice\}>₹\{item\.price\.toFixed\(0\)\}<\/Text>'
new_render = '''<View style={styles.rowBottom}>
            <View>
              {item.old_price && item.old_price > item.price && (
                <Text style={styles.rowOldPrice}>₹{item.old_price.toFixed(0)}</Text>
              )}
              <Text style={styles.rowPrice}>₹{item.price.toFixed(0)}</Text>
            </View>'''

master_content = re.sub(old_render, new_render, master_content)

with open('app-main/frontend/app/master/index.tsx', 'w', encoding='utf-8') as f:
    f.write(master_content)

print('Updated master menu to show old_price')

# Fix chef menu
with open('app-main/frontend/app/chef/index.tsx', 'r', encoding='utf-8') as f:
    chef_content = f.read()

# Update chef to show old_price in cart review
old_price_check = r'{item\.old_price > item\.price && \('
new_price_check = '{item.old_price && item.old_price > item.price && ('

chef_content = chef_content.replace(old_price_check, new_price_check)

with open('app-main/frontend/app/chef/index.tsx', 'w', encoding='utf-8') as f:
    f.write(chef_content)

print('Updated chef menu to safely check old_price')

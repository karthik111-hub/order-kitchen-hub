with open('app-main/frontend/app/admin/items.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the load callback to remove selectedCat dependency
old_load = """  const load = useCallback(async () => {
    try {
      const [c, i] = await Promise.all([api.listCategories(), api.listMenu(undefined, true)]);
      setCats(c);
      setItems(i);
      if (!selectedCat && c.length > 0) setSelectedCat(c[0].name);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [selectedCat]);"""

new_load = """  const load = useCallback(async () => {
    try {
      const [c, i] = await Promise.all([api.listCategories(), api.listMenu(undefined, true)]);
      setCats(c);
      setItems(i);
      // Set initial category only on first load
      setSelectedCat(prev => prev || (c.length > 0 ? c[0].name : null));
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, []);"""

content = content.replace(old_load, new_load)

# Also fix the price display bug - need to handle optional old_price
old_price_check = """{item.old_price > item.price && (
                        <Text style={styles.oldPrice}>₹{item.old_price.toFixed(0)}</Text>
                      )}"""

new_price_check = """{item.old_price && item.old_price > item.price && (
                        <Text style={styles.oldPrice}>₹{item.old_price.toFixed(0)}</Text>
                      )}"""

content = content.replace(old_price_check, new_price_check)

# Fix price conversion in openEditForm
old_set_price = """    setPrice(item.price);
    setOldPrice(item.old_price);"""

new_set_price = """    setPrice(item.price.toString());
    setOldPrice(item.old_price?.toString() || '');"""

content = content.replace(old_set_price, new_set_price)

with open('app-main/frontend/app/admin/items.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed category loading and price display')

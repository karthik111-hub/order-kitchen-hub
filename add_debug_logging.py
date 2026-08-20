with open('app-main/frontend/app/admin/items.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add debug logging to the load function
old_load = """  const load = useCallback(async () => {
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

new_load = """  const load = useCallback(async () => {
    try {
      console.log('[ADMIN-ITEMS] Loading categories and items...');
      const [c, i] = await Promise.all([api.listCategories(), api.listMenu(undefined, true)]);
      console.log('[ADMIN-ITEMS] Loaded categories:', c);
      console.log('[ADMIN-ITEMS] Loaded items:', i);
      setCats(c);
      setItems(i);
      // Set initial category only on first load
      setSelectedCat(prev => prev || (c.length > 0 ? c[0].name : null));
      console.log('[ADMIN-ITEMS] Set', c.length, 'categories and', i.length, 'items');
    } catch (e) {
      console.error('[ADMIN-ITEMS] Error loading:', e);
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, []);"""

content = content.replace(old_load, new_load)

with open('app-main/frontend/app/admin/items.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Added debug logging to load function')

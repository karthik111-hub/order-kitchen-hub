import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { api, Category, MenuItem, ItemTag } from '@/src/api';
import { colors, radius, spacing, type, thumb, shadow } from '@/src/theme';

const TAG_OPTIONS: { key: ItemTag | null; label: string; color: string }[] = [
  { key: null, label: 'None', color: colors.muted },
  { key: 'must_buy', label: 'Must Buy', color: colors.mustBuy },
  { key: 'most_selling', label: 'Most Selling', color: colors.mostSelling },
];

export default function AdminItems() {
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [oldPrice, setOldPrice] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [tag, setTag] = useState<ItemTag | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
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
  }, [selectedCat]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => (selectedCat ? items.filter(i => i.category === selectedCat) : items),
    [items, selectedCat],
  );

  const openForm = () => {
    setEditingItem(null);
    setName('');
    setPrice('');
    setOldPrice('');
    setImageBase64(null);
    setTag(null);
    setIsAvailable(true);
    setFormOpen(true);
  };

  const openEditForm = (item: MenuItem) => {
    console.log('[DEBUG] Edit button clicked for item:', item.id, item.name);
    setEditingItem(item);
    setName(item.name);
    setPrice(item.price.toString());
    setOldPrice(item.old_price?.toString() || '');
    setImageBase64(item.image_base64 || null);
    setTag(item.tag || null);
    setIsAvailable(item.is_available);
    setFormOpen(true);
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const save = async () => {
    if (!selectedCat) {
      Alert.alert('Pick a category', 'Please choose a category first.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Missing name', 'Give the item a name.');
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert('Invalid price', 'Enter a valid price.');
      return;
    }
    try {
      setSaving(true);
      const oldPriceNum = oldPrice ? parseFloat(oldPrice) : undefined;
      
      if (editingItem) {
        console.log('[DEBUG] Updating item:', editingItem.id);
        await api.updateMenuItem(editingItem.id, {
          name: name.trim(),
          price: priceNum,
          old_price: oldPriceNum,
          tag,
          image_base64: imageBase64,
          is_available: isAvailable,
        });
        console.log('[DEBUG] Item updated successfully');
      } else {
        console.log('[DEBUG] Creating new item');
        await api.createMenuItem({
          name: name.trim(),
          price: priceNum,
          old_price: oldPriceNum,
          category: selectedCat,
          tag,
          image_base64: imageBase64,
          is_available: isAvailable,
        });
        console.log('[DEBUG] Item created successfully');
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFormOpen(false);
      load();
    } catch (e: any) {
      console.error('[DEBUG] Save error:', e);
      Alert.alert('Save failed', e?.message ?? 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const remove = (item: MenuItem) => {
    console.log('[DEBUG] Delete button clicked for item:', item.id, item.name);
    const confirmed = confirm(`Delete "${item.name}"?`);
    if (confirmed) {
      handleDelete(item);
    }
  };

  const handleDelete = async (item: MenuItem) => {
    console.log('[DEBUG] Delete confirmed for:', item.id);
    try {
      console.log('[DEBUG] Calling deleteMenuItem API...');
      await api.deleteMenuItem(item.id);
      console.log('[DEBUG] Delete successful');
      load();
    } catch (e: any) {
      console.error('[DEBUG] Delete error:', e);
      alert('Delete failed: ' + (e?.message || 'Unknown error'));
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      console.log('[DEBUG] Toggling availability for item:', item.id);
      await api.updateMenuItem(item.id, {
        name: item.name,
        price: item.price,
        tag: item.tag,
        image_base64: item.image_base64,
        is_available: !item.is_available,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      load();
    } catch (e: any) {
      console.error('[DEBUG] Toggle error:', e);
      Alert.alert('Failed to toggle', e?.message ?? 'Try again');
    }
  };

  const tagStyle = (t: ItemTag) => ({
    color: t === 'must_buy' ? colors.mustBuy : colors.mostSelling,
    label: t === 'must_buy' ? 'MUST BUY' : 'MOST SELLING',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Items</Text>
          <Text style={styles.sub}>Add items into categories</Text>
        </View>
      </View>

      {cats.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="albums-outline" size={26} color={colors.brand} />
          </View>
          <Text style={styles.emptyTitle}>Create a category first</Text>
          <Text style={styles.emptySub}>
            Go to the Categories tab and add at least one.
          </Text>
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {cats.map(c => {
              const active = selectedCat === c.name;
              return (
                <Pressable
                  key={c.id}
                  testID={`admin-cat-chip-${c.name}`}
                  onPress={() => setSelectedCat(c.name)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {loading ? (
            <ActivityIndicator color={colors.brand} style={{ marginTop: spacing.xl }} />
          ) : filtered.length === 0 ? (
            <View style={styles.subEmpty}>
              <Text style={styles.emptySub}>No items in {selectedCat} yet.</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{
                paddingHorizontal: spacing.lg,
                paddingBottom: 100,
                gap: spacing.sm,
              }}
            >
              {filtered.map(item => (
                <View style={styles.itemRow} key={item.id} testID={`admin-item-${item.id}`}>
                  <Image
                    source={{
                      uri:
                        item.image_base64 ||
                        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=200&q=60',
                    }}
                    style={styles.itemImg}
                    contentFit="cover"
                  />
                  <View style={{ flex: 1 }}>
                    <View style={styles.itemTopRow}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      {item.tag ? (
                        <View
                          style={[
                            styles.tagPill,
                            { backgroundColor: tagStyle(item.tag).color + '22' },
                          ]}
                        >
                          <Ionicons
                            name="star"
                            size={7}
                            color={tagStyle(item.tag).color}
                          />
                          <Text style={[styles.tagText, { color: tagStyle(item.tag).color }]}>
                            {tagStyle(item.tag).label}
                          </Text>
                        </View>
                      ) : null}
                      {!item.is_available && (
                        <View style={styles.hiddenBadge}>
                          <Ionicons name="eye-off" size={7} color={colors.error} />
                          <Text style={styles.hiddenBadgeText}>Hidden</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.itemPrice}>₹{item.price.toFixed(0)}</Text>
                  </View>
                  <Pressable
                    testID={`admin-item-toggle-${item.id}`}
                    onPress={() => toggleAvailability(item)}
                    style={[
                      styles.toggleBtn,
                      { backgroundColor: item.is_available ? colors.brand : colors.error },
                    ]}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={item.is_available ? 'eye-outline' : 'eye-off-outline'}
                      size={14}
                      color={colors.onBrandPrimary}
                    />
                  </Pressable>
                  <Pressable
                    testID={`admin-item-edit-${item.id}`}
                    onPress={() => openEditForm(item)}
                    style={styles.editBtn}
                    hitSlop={8}
                  >
                    <Ionicons name="pencil-outline" size={14} color={colors.brand} />
                  </Pressable>
                  <Pressable
                    testID={`admin-item-delete-${item.id}`}
                    onPress={() => remove(item)}
                    style={styles.deleteBtn}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={14} color={colors.error} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}

          <Pressable
            testID="admin-add-item-fab"
            onPress={openForm}
            style={styles.fab}
          >
            <Ionicons name="add" size={20} color={colors.onBrandPrimary} />
            <Text style={styles.fabText}>Add item to {selectedCat}</Text>
          </Pressable>
        </>
      )}

      <Modal
        visible={formOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFormOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalRoot}
        >
          <Pressable style={styles.backdrop} onPress={() => setFormOpen(false)} />
          <ScrollView
            style={styles.sheet}
            contentContainerStyle={{ paddingBottom: spacing.md }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>
              {editingItem ? `Edit ${editingItem.name}` : `New item in ${selectedCat}`}
            </Text>

            <Pressable
              testID="admin-pick-image-btn"
              onPress={pickImage}
              style={styles.imagePicker}
            >
              {imageBase64 ? (
                <Image
                  source={{ uri: imageBase64 }}
                  style={styles.pickedImage}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera-outline" size={18} color={colors.brand} />
                  <Text style={styles.pickerText}>Add photo</Text>
                </View>
              )}
            </Pressable>

            <TextInput
              testID="admin-item-name-input"
              placeholder="Item name (e.g., Paneer Tikka)"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
            <TextInput
              testID="admin-item-price-input"
              placeholder="Price"
              placeholderTextColor={colors.muted}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <TextInput
              testID="admin-item-old-price-input"
              placeholder="Old price (optional)"
              placeholderTextColor={colors.muted}
              value={oldPrice}
              onChangeText={setOldPrice}
              keyboardType="decimal-pad"
              style={styles.input}
            />

            <Text style={styles.tagLabel}>Highlight tag (optional)</Text>
            <View style={styles.tagRow}>
              {TAG_OPTIONS.map(opt => {
                const active = tag === opt.key;
                return (
                  <Pressable
                    key={opt.label}
                    testID={`admin-tag-${opt.label.toLowerCase().replace(' ', '-')}`}
                    onPress={() => setTag(opt.key)}
                    style={[
                      styles.tagChip,
                      {
                        borderColor: active ? opt.color : colors.border,
                        backgroundColor: active ? opt.color + '18' : colors.surfaceSecondary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagChipText,
                        { color: active ? opt.color : colors.onSurfaceTertiary },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.availabilityRow}>
              <View>
                <Text style={styles.tagLabel}>Visibility</Text>
                <Text style={styles.availabilityDesc}>
                  {isAvailable ? 'Visible to Master' : 'Hidden from Menu'}
                </Text>
              </View>
              <Pressable
                testID={`admin-toggle-availability-${editingItem?.id}`}
                onPress={() => setIsAvailable(!isAvailable)}
                style={[styles.toggle, isAvailable && styles.toggleOn]}
              >
                <View style={[styles.toggleThumb, isAvailable && styles.toggleThumbOn]} />
              </Pressable>
            </View>

            <Pressable
              testID="admin-save-item-btn"
              onPress={save}
              disabled={saving}
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            >
              {saving ? (
                <ActivityIndicator color={colors.onBrandPrimary} />
              ) : (
                <Text style={styles.saveBtnText}>
                  {editingItem ? 'Update item' : 'Add to menu'}
                </Text>
              )}
            </Pressable>
            <Pressable onPress={() => setFormOpen(false)} style={styles.cancelBtn} disabled={saving}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: { fontSize: type.xxl, fontWeight: '800', color: colors.onSurface, letterSpacing: -0.5 },
  sub: { color: colors.muted, marginTop: 2, fontSize: type.sm },

  chipsRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    height: 26,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.onSurfaceTertiary, fontWeight: '700', fontSize: type.sm },
  chipTextActive: { color: colors.onBrandPrimary },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  subEmpty: { padding: spacing.xl, alignItems: 'center' },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: { fontSize: type.lg, fontWeight: '800', color: colors.onSurface },
  emptySub: { marginTop: 4, color: colors.onSurfaceTertiary, textAlign: 'center', fontSize: type.sm },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.sm,
    borderRadius: radius.md,
    ...shadow.soft,
  },
  itemImg: { width: thumb.sm, height: thumb.sm, borderRadius: radius.sm },
  itemTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  itemName: { fontSize: type.base, fontWeight: '700', color: colors.onSurface },
  itemPrice: { fontSize: type.sm, color: colors.muted, marginTop: 2 },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  tagText: { fontSize: type.xs, fontWeight: '800', letterSpacing: 0.2 },
  hiddenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.error + '22',
  },
  hiddenBadgeText: {
    fontSize: type.xs,
    fontWeight: '800',
    color: colors.error,
  },
  editBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: '#E3F2FD',
  },
  toggleBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  deleteBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: '#FFE5E3',
  },

  fab: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brand,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    ...shadow.card,
  },
  fabText: { color: colors.onBrandPrimary, fontWeight: '800', fontSize: type.base },

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '90%',
  },
  handle: {
    alignSelf: 'center',
    width: 30,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.md,
  },
  sheetTitle: { fontSize: type.lg, fontWeight: '800', color: colors.onSurface, marginBottom: spacing.md },
  imagePicker: {
    alignSelf: 'center',
    width: thumb.lg,
    height: thumb.lg,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceTertiary,
    marginBottom: spacing.md,
  },
  pickedImage: { width: '100%', height: '100%' },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderWidth: 1.5,
    borderColor: colors.brandTertiary,
    borderStyle: 'dashed',
    borderRadius: radius.md,
  },
  pickerText: { color: colors.brand, fontWeight: '700', fontSize: type.sm },
  input: {
    backgroundColor: colors.surfaceTertiary,
    padding: spacing.md,
    borderRadius: radius.md,
    color: colors.onSurface,
    fontSize: type.base,
    marginBottom: spacing.sm,
  },
  tagLabel: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    fontSize: type.sm,
    color: colors.onSurfaceTertiary,
    fontWeight: '700',
  },
  tagRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.md },
  tagChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  tagChipText: { fontSize: type.sm, fontWeight: '800' },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceTertiary,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  availabilityDesc: {
    marginTop: 2,
    fontSize: type.sm,
    color: colors.muted,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    justifyContent: 'center',
    padding: 2,
  },
  toggleOn: {
    backgroundColor: colors.brand,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.onSurface,
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
    backgroundColor: colors.onBrandPrimary,
  },
  saveBtn: {
    backgroundColor: colors.brand,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveBtnText: { color: colors.onBrandPrimary, fontWeight: '800', fontSize: type.base },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.sm, marginTop: 4 },
  cancelBtnText: { color: colors.muted, fontWeight: '600', fontSize: type.sm },
});

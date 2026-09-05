import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { api, MenuItem, ItemTag, OrderItem } from '@/src/api';
import { colors, radius, spacing, type, thumb, shadow } from '@/src/theme';

const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=60';

const tagLabel = (tag: ItemTag) =>
  tag === 'must_buy' ? 'MUST BUY' : 'MOST SELLING';
const tagColor = (tag: ItemTag) =>
  tag === 'must_buy' ? colors.mustBuy : colors.mostSelling;

type Section = { category: string; items: MenuItem[] };
type CartItem = OrderItem & { tempId?: string };

export default function ChefPlaceOrder() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [cartOpen, setCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [miscName, setMiscName] = useState('');
  const [miscPrice, setMiscPrice] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.listMenu(undefined, true);
      setItems(data);
    } catch (e: any) {
      console.warn('Menu load failed', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const newCart = new Map(prev);
      if (newCart.has(item.id)) {
        const existing = newCart.get(item.id)!;
        newCart.set(item.id, { ...existing, quantity: existing.quantity + 1 });
      } else {
        newCart.set(item.id, {
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          old_price: item.old_price,
          quantity: 1,
          image_base64: item.image_base64,
        });
      }
      return newCart;
    });
    Haptics.selectionAsync();
  };

  const increment = (itemId: string) => {
    setCart(prev => {
      const newCart = new Map(prev);
      const item = newCart.get(itemId);
      if (item) {
        newCart.set(itemId, { ...item, quantity: item.quantity + 1 });
      }
      return newCart;
    });
    Haptics.selectionAsync();
  };

  const decrement = (itemId: string) => {
    setCart(prev => {
      const newCart = new Map(prev);
      const item = newCart.get(itemId);
      if (item) {
        if (item.quantity === 1) {
          newCart.delete(itemId);
        } else {
          newCart.set(itemId, { ...item, quantity: item.quantity - 1 });
        }
      }
      return newCart;
    });
    Haptics.selectionAsync();
  };

  const addMiscItem = () => {
    if (!miscName.trim()) {
      Alert.alert('Error', 'Enter item name');
      return;
    }
    if (!miscPrice.trim() || isNaN(parseFloat(miscPrice))) {
      Alert.alert('Error', 'Enter valid price');
      return;
    }
    const id = `misc-${Date.now()}`;
    setCart(prev => {
      const newCart = new Map(prev);
      newCart.set(id, {
        menu_item_id: id,
        name: miscName,
        price: parseFloat(miscPrice),
        quantity: 1,
        tempId: id,
      });
      return newCart;
    });
    setMiscName('');
    setMiscPrice('');
  };

  const { categories, sections } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const visible = q ? items.filter(it => it.name.toLowerCase().includes(q)) : items;
    const map: Record<string, MenuItem[]> = {};
    for (const it of visible) {
      if (!map[it.category]) map[it.category] = [];
      map[it.category].push(it);
    }
    const cats = Object.keys(map).sort();
    const flat: Section[] = cats.map(c => ({ category: c, items: map[c] }));
    const filtered =
      q || activeCategory === 'All'
        ? flat
        : flat.filter(s => s.category === activeCategory);
    return { categories: ['All', ...cats], sections: filtered };
  }, [items, activeCategory, searchQuery]);

  const flatData = useMemo(() => {
    const rows: Array<
      | { type: 'header'; category: string; count: number }
      | { type: 'item'; item: MenuItem }
    > = [];
    sections.forEach(sec => {
      rows.push({ type: 'header', category: sec.category, count: sec.items.length });
      sec.items.forEach(item => rows.push({ type: 'item', item }));
    });
    return rows;
  }, [sections]);

  const lines = Array.from(cart.values());
  const totalQty = lines.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = lines.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const placeOrder = async () => {
    if (lines.length === 0) return;
    try {
      setPlacing(true);
      await api.createOrder({
        items: lines,
        table_number: tableNumber || undefined,
        notes: notes || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCart(new Map());
      setTableNumber('');
      setNotes('');
      setCartOpen(false);
      Alert.alert('Success', 'Order placed', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Failed', e?.message ?? 'Try again');
    } finally {
      setPlacing(false);
    }
  };

  const renderRow = ({
    item: row,
  }: {
    item: (typeof flatData)[number];
  }) => {
    if (row.type === 'header') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{row.category}</Text>
          <Text style={styles.sectionCount}>{row.count}</Text>
        </View>
      );
    }
    const item = row.item;
    const inCart = cart.get(item.id);
    return (
      <View style={styles.listRow}>
        <Image
          source={{ uri: item.image_base64 || PLACEHOLDER_IMG }}
          style={styles.rowImage}
          contentFit="cover"
          transition={150}
        />
        <View style={{ flex: 1 }}>
          <View style={styles.rowTop}>
            <Text numberOfLines={2} style={styles.rowName}>
              {item.name}
            </Text>
            {item.tag ? (
              <View style={[styles.tagPill, { backgroundColor: tagColor(item.tag) + '22' }]}>
                <Ionicons name="star" size={8} color={tagColor(item.tag)} />
                <Text style={[styles.tagText, { color: tagColor(item.tag) }]}>
                  {tagLabel(item.tag)}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.rowBottom}>
            <View>
              {item.old_price && item.old_price > item.price && (
                <Text style={styles.rowOldPrice}>₹{item.old_price.toFixed(0)}</Text>
              )}
              <Text style={styles.rowPrice}>₹{item.price.toFixed(0)}</Text>
            </View>
            {inCart ? (
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => decrement(item.id)}
                  style={styles.stepBtn}
                >
                  <Ionicons name="remove" size={12} color={colors.brand} />
                </Pressable>
                <Text style={styles.stepQty}>{inCart.quantity}</Text>
                <Pressable
                  onPress={() => increment(item.id)}
                  style={styles.stepBtn}
                >
                  <Ionicons name="add" size={12} color={colors.brand} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => addToCart(item)}
                style={styles.addBtn}
              >
                <Text style={styles.addBtnText}>ADD</Text>
                <Ionicons name="add" size={10} color={colors.brand} />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>Place an order</Text>
          <Text style={styles.headerSub}>{items.length} items available</Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          style={styles.switchBtn}
        >
          <Ionicons name="chevron-back" size={14} color={colors.brand} />
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={14} color={colors.muted} />
        <TextInput
          placeholder="Search dishes..."
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          style={styles.searchInput}
        />
        {searchQuery.length > 0 && (
          <Pressable
            onPress={() => setSearchQuery('')}
            hitSlop={8}
            style={styles.searchClear}
          >
            <Ionicons name="close-circle" size={16} color={colors.muted} />
          </Pressable>
        )}
      </View>

      {categories.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {categories.map(c => {
            const active = activeCategory === c;
            return (
              <Pressable
                key={c}
                onPress={() => setActiveCategory(c)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="restaurant-outline" size={28} color={colors.brand} />
          </View>
          <Text style={styles.emptyTitle}>Menu is empty</Text>
        </View>
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={(row, idx) =>
            row.type === 'header' ? `h-${row.category}` : `i-${row.item.id}-${idx}`
          }
          renderItem={renderRow}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: totalQty > 0 ? 110 : spacing.xl,
            paddingTop: spacing.sm,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.brand}
            />
          }
        />
      )}

      {totalQty > 0 && (
        <View
          style={[styles.stickyCartWrap, { paddingBottom: insets.bottom + 70 }]}
          pointerEvents="box-none"
        >
          <BlurView intensity={40} tint="light" style={styles.stickyCart}>
            <View style={styles.cartInfo}>
              <Text style={styles.cartQty}>{totalQty} items</Text>
              <Text style={styles.cartTotal}>₹{totalPrice.toFixed(0)}</Text>
            </View>
            <Pressable
              onPress={() => setCartOpen(true)}
              style={styles.viewCartBtn}
            >
              <Text style={styles.viewCartText}>View cart</Text>
              <Ionicons name="arrow-forward" size={12} color={colors.onBrandPrimary} />
            </Pressable>
          </BlurView>
        </View>
      )}

      <Modal
        visible={cartOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCartOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalRoot}
        >
          <Pressable style={styles.backdrop} onPress={() => setCartOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Review Order</Text>
            <ScrollView
              style={{ maxHeight: 260 }}
              contentContainerStyle={{ paddingBottom: spacing.sm }}
            >
              {lines.map(l => (
                <View key={l.menu_item_id} style={styles.cartRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cartRowName}>{l.name}</Text>
                    <Text style={styles.cartRowPrice}>₹{l.price.toFixed(0)}</Text>
                  </View>
                  <View style={styles.stepper}>
                    <Pressable
                      onPress={() => decrement(l.menu_item_id)}
                      style={styles.stepBtn}
                    >
                      <Ionicons name="remove" size={12} color={colors.brand} />
                    </Pressable>
                    <Text style={styles.stepQty}>{l.quantity}</Text>
                    <Pressable
                      onPress={() => increment(l.menu_item_id)}
                      style={styles.stepBtn}
                    >
                      <Ionicons name="add" size={12} color={colors.brand} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.divider} />
            <TextInput
              placeholder="Table number (optional)"
              placeholderTextColor={colors.muted}
              value={tableNumber}
              onChangeText={setTableNumber}
              style={styles.input}
            />
            <TextInput
              placeholder="Notes (optional)"
              placeholderTextColor={colors.muted}
              value={notes}
              onChangeText={setNotes}
              style={[styles.input, { height: 48 }]}
              multiline
            />

            {/* Misc Item Section */}
            <View style={styles.miscSection}>
              <Text style={styles.miscTitle}>Add Misc Item</Text>
              <TextInput
                placeholder="Item name"
                value={miscName}
                onChangeText={setMiscName}
                style={[styles.input, { marginBottom: spacing.sm }]}
              />
              <TextInput
                placeholder="Price"
                value={miscPrice}
                onChangeText={setMiscPrice}
                keyboardType="decimal-pad"
                style={[styles.input, { marginBottom: spacing.sm }]}
              />
              <Pressable
                onPress={addMiscItem}
                style={styles.addMiscBtn}
              >
                <Ionicons name="add" size={16} color={colors.onBrandPrimary} />
                <Text style={styles.addMiscBtnText}>Add to Order</Text>
              </Pressable>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹{totalPrice.toFixed(0)}</Text>
            </View>

            <Pressable
              onPress={placeOrder}
              disabled={placing}
              style={[styles.placeBtn, placing && { opacity: 0.7 }]}
            >
              {placing ? (
                <ActivityIndicator color={colors.onBrandPrimary} />
              ) : (
                <>
                  <Ionicons name="send" size={14} color={colors.onBrandPrimary} />
                  <Text style={styles.placeBtnText}>Place Order</Text>
                </>
              )}
            </Pressable>
          </View>
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
    gap: spacing.md,
  },
  hello: { fontSize: type.xxl, fontWeight: '800', color: colors.onSurface, letterSpacing: -0.5 },
  headerSub: { color: colors.muted, marginTop: 2, fontSize: type.sm },
  switchBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchWrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.onSurface,
    fontSize: type.base,
    paddingVertical: 4,
  },
  searchClear: { paddingHorizontal: 2 },
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
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: type.lg,
    fontWeight: '800',
    color: colors.onSurface,
    letterSpacing: -0.3,
  },
  sectionCount: {
    fontSize: type.sm,
    color: colors.muted,
    fontWeight: '600',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    ...shadow.soft,
  },
  rowImage: {
    width: thumb.md,
    height: thumb.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceTertiary,
  },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  rowName: {
    flex: 1,
    fontSize: type.base,
    fontWeight: '700',
    color: colors.onSurface,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  tagText: { fontSize: type.xs, fontWeight: '800', letterSpacing: 0.3 },
  rowBottom: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowPrice: { fontSize: type.lg, fontWeight: '800', color: colors.onSurface },
  rowOldPrice: {
    fontSize: type.sm,
    color: colors.muted,
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: colors.brand,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  addBtnText: { color: colors.brand, fontWeight: '800', fontSize: type.sm, letterSpacing: 0.5 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  stepBtn: { paddingHorizontal: spacing.sm, paddingVertical: 3 },
  stepQty: {
    minWidth: 16,
    textAlign: 'center',
    color: colors.brand,
    fontWeight: '800',
    fontSize: type.base,
  },
  stickyCartWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
  },
  stickyCart: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  cartInfo: { flex: 1 },
  cartQty: { color: colors.onSurfaceTertiary, fontSize: type.sm, fontWeight: '600' },
  cartTotal: { color: colors.onSurface, fontSize: type.lg, fontWeight: '800' },
  viewCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  viewCartText: { color: colors.onBrandPrimary, fontWeight: '800', fontSize: type.base },

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 30,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.md,
  },
  sheetTitle: { fontSize: type.lg, fontWeight: '800', color: colors.onSurface, marginBottom: spacing.sm },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  cartRowName: { color: colors.onSurface, fontWeight: '700', fontSize: type.base },
  cartRowPrice: { color: colors.muted, fontSize: type.sm, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.sm },
  input: {
    backgroundColor: colors.surfaceTertiary,
    padding: spacing.md,
    borderRadius: radius.md,
    color: colors.onSurface,
    marginBottom: spacing.sm,
    fontSize: type.base,
  },
  miscSection: {
    backgroundColor: colors.surfaceTertiary,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  miscTitle: {
    fontSize: type.sm,
    fontWeight: '800',
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  addMiscBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brand,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  addMiscBtnText: {
    color: colors.onBrandPrimary,
    fontWeight: '700',
    fontSize: type.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  totalLabel: { color: colors.onSurfaceTertiary, fontSize: type.base, fontWeight: '600' },
  totalValue: { color: colors.onSurface, fontSize: type.lg, fontWeight: '800' },
  placeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.brand,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  placeBtnText: { color: colors.onBrandPrimary, fontWeight: '800', fontSize: type.base },
});

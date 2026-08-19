import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  AppState,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { api, MenuItem, ItemTag } from '@/src/api';
import { cartStore, useCart } from '@/src/cart';
import { colors, radius, spacing, type, thumb, shadow } from '@/src/theme';

const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=60';

const tagLabel = (tag: ItemTag) =>
  tag === 'must_buy' ? 'MUST BUY' : 'MOST SELLING';
const tagColor = (tag: ItemTag) =>
  tag === 'must_buy' ? colors.mustBuy : colors.mostSelling;

type Section = { category: string; items: MenuItem[] };

export default function MasterMenu() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const { cart, lines, totalQty, totalPrice } = useCart();
  const [savingDraft, setSavingDraft] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [payConfigured, setPayConfigured] = useState<boolean>(false);
  const [paying, setPaying] = useState(false);
  const [pendingIntentId, setPendingIntentId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.listMenu();
      setItems(data);
    } catch (e: any) {
      console.warn('Menu load failed', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refreshPayStatus = useCallback(async () => {
    try {
      const s = await api.rzpStatus();
      setPayConfigured(s.configured);
    } catch {
      setPayConfigured(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      refreshPayStatus();
    }, [load, refreshPayStatus]),
  );

  useEffect(() => {
    load();
    refreshPayStatus();
  }, [load, refreshPayStatus]);

  // When app returns to foreground while a payment intent is pending, poll for completion
  const checkIntent = useCallback(
    async (intentId: string) => {
      try {
        const it = await api.rzpGetIntent(intentId);
        if (it.status === 'completed') {
          if (pollRef.current) clearInterval(pollRef.current);
          setPendingIntentId(null);
          setPaying(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          cartStore.clear();
          setTableNumber('');
          setNotes('');
          setCartOpen(false);
          router.push('/master/orders' as any);
        } else if (it.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
          setPendingIntentId(null);
          setPaying(false);
          Alert.alert('Payment failed', 'Please try again or send directly.');
        }
      } catch {
        /* ignore transient errors */
      }
    },
    [router],
  );

  useEffect(() => {
    if (!pendingIntentId) return;
    checkIntent(pendingIntentId);
    pollRef.current = setInterval(() => checkIntent(pendingIntentId), 3000);
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') checkIntent(pendingIntentId);
    });
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      sub.remove();
    };
  }, [pendingIntentId, checkIntent]);

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
    // When searching, ignore category filter and show all matches grouped by category.
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
      cartStore.clear();
      setTableNumber('');
      setNotes('');
      setCartOpen(false);
      router.push('/master/orders' as any);
    } catch (e: any) {
      Alert.alert('Failed to place order', e?.message ?? 'Try again');
    } finally {
      setPlacing(false);
    }
  };

  const payAndPlace = async () => {
    if (lines.length === 0) return;
    try {
      setPaying(true);
      const intent = await api.rzpCreateIntent({
        items: lines,
        table_number: tableNumber || undefined,
        notes: notes || undefined,
      });
      setPendingIntentId(intent.intent_id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await WebBrowser.openBrowserAsync(intent.checkout_url);
      // On return, useEffect above will poll intent status.
      checkIntent(intent.intent_id);
    } catch (e: any) {
      setPaying(false);
      setPendingIntentId(null);
      Alert.alert('Payment error', e?.message ?? 'Please try again');
    }
  };
  
    const saveDraft = async () => {
    if (lines.length === 0) return;
    try {
      setSavingDraft(true);
      await api.saveDraft({
        items: lines,
        table_number: tableNumber || undefined,
        notes: notes || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      cartStore.clear();
      setTableNumber('');
      setNotes('');
      setCartOpen(false);
      Alert.alert('Success', 'Order saved as draft');
    } catch (e: any) {
      Alert.alert('Failed to save draft', e?.message ?? 'Try again');
    } finally {
      setSavingDraft(false);
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
    const inCart = cart[item.id];
    return (
      <View style={styles.listRow} testID={`menu-item-${item.id}`}>
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
            <Text style={styles.rowPrice}>₹{item.price.toFixed(0)}</Text>
            {inCart ? (
              <View style={styles.stepper}>
                <Pressable
                  testID={`stepper-dec-${item.id}`}
                  onPress={() => {
                    Haptics.selectionAsync();
                    cartStore.decrement(item.id);
                  }}
                  style={styles.stepBtn}
                >
                  <Ionicons name="remove" size={12} color={colors.brand} />
                </Pressable>
                <Text style={styles.stepQty}>{inCart.quantity}</Text>
                <Pressable
                  testID={`stepper-inc-${item.id}`}
                  onPress={() => {
                    Haptics.selectionAsync();
                    cartStore.increment(item.id);
                  }}
                  style={styles.stepBtn}
                >
                  <Ionicons name="add" size={12} color={colors.brand} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                testID={`add-to-cart-${item.id}`}
                onPress={() => {
                  Haptics.selectionAsync();
                  cartStore.add(item);
                }}
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
          <Text style={styles.hello}>Take an order</Text>
          <Text style={styles.headerSub}>{items.length} items on the menu</Text>
        </View>
        <Pressable
          testID="switch-role-btn"
          onPress={() => router.replace('/' as any)}
          style={styles.switchBtn}
        >
          <Ionicons name="swap-horizontal" size={14} color={colors.brand} />
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={14} color={colors.muted} />
        <TextInput
          testID="menu-search-input"
          placeholder="Search dishes..."
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          returnKeyType="search"
          style={styles.searchInput}
        />
        {searchQuery.length > 0 && (
          <Pressable
            testID="menu-search-clear"
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
                testID={`cat-chip-${c}`}
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
          <Text style={styles.emptySub}>
            Ask the Admin to add categories and items.
          </Text>
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
          ListEmptyComponent={
            searchQuery.trim().length > 0 ? (
              <View style={styles.noMatch} testID="menu-search-empty">
                <Ionicons name="search-outline" size={22} color={colors.muted} />
                <Text style={styles.noMatchTitle}>No dishes match "{searchQuery}"</Text>
                <Text style={styles.noMatchSub}>Try a different name or clear the search.</Text>
              </View>
            ) : null
          }
        />
      )}

      {totalQty > 0 && (
        <View
          testID="sticky-cart"
          style={[styles.stickyCartWrap, { paddingBottom: insets.bottom + 70 }]}
          pointerEvents="box-none"
        >
          <BlurView intensity={40} tint="light" style={styles.stickyCart}>
            <View style={styles.cartInfo}>
              <Text style={styles.cartQty}>{totalQty} items</Text>
              <Text style={styles.cartTotal}>₹{totalPrice.toFixed(0)}</Text>
            </View>
            <Pressable
              testID="open-cart-btn"
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
              showsVerticalScrollIndicator={false}
            >
              {lines.map(l => (
                <View key={l.menu_item_id} style={styles.cartRow} testID={`cart-row-${l.menu_item_id}`}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cartRowName}>{l.name}</Text>
                    <Text style={styles.cartRowPrice}>₹{l.price.toFixed(0)}</Text>
                  </View>
                  <View style={styles.stepper}>
                    <Pressable
                      onPress={() => cartStore.decrement(l.menu_item_id)}
                      style={styles.stepBtn}
                    >
                      <Ionicons name="remove" size={12} color={colors.brand} />
                    </Pressable>
                    <Text style={styles.stepQty}>{l.quantity}</Text>
                    <Pressable
                      onPress={() => cartStore.increment(l.menu_item_id)}
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
              testID="cart-table-input"
              placeholder="Table number (optional)"
              placeholderTextColor={colors.muted}
              value={tableNumber}
              onChangeText={setTableNumber}
              style={styles.input}
              returnKeyType="next"
            />
            <TextInput
              testID="cart-notes-input"
              placeholder="Notes for the chef (optional)"
              placeholderTextColor={colors.muted}
              value={notes}
              onChangeText={setNotes}
              style={[styles.input, { height: 48 }]}
              multiline
            />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹{totalPrice.toFixed(0)}</Text>
            </View>

            <Pressable
              testID="place-order-btn"
              onPress={placeOrder}
              disabled={placing || paying}
              style={[styles.placeBtn, (placing || paying) && { opacity: 0.7 }]}
            >
              {placing ? (
                <ActivityIndicator color={colors.onBrandPrimary} />
              ) : (
                <>
                  <Ionicons name="send" size={14} color={colors.onBrandPrimary} />
                  <Text style={styles.placeBtnText}>Send Directly to Kitchen</Text>
                </>
              )}
            </Pressable>

            <Pressable
              testID="pay-and-place-btn"
              onPress={payAndPlace}
              disabled={paying || placing || !payConfigured}
              style={[
                styles.payBtn,
                (!payConfigured || paying || placing) && { opacity: 0.55 },
              ]}
            >
              {paying ? (
                <ActivityIndicator color={colors.brand} />
              ) : (
                <>
                  <Ionicons name="card-outline" size={14} color={colors.brand} />
                  <Text style={styles.payBtnText}>
                    {payConfigured ? 'Pay & Send (UPI / Card)' : 'Payments not configured'}
                  </Text>
                </>
              )}
            </Pressable>
			<Pressable
              testID="save-draft-btn"
              onPress={saveDraft}
              disabled={savingDraft || placing || paying}
              style={[
                styles.draftBtn,
                (savingDraft || placing || paying) && { opacity: 0.55 },
              ]}
            >
              {savingDraft ? (
                <ActivityIndicator color={colors.muted} />
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={14} color={colors.muted} />
                  <Text style={styles.draftBtnText}>Save as Draft</Text>
                </>
              )}
            </Pressable>
            {!payConfigured && (
              <Text style={styles.payHint}>Ask the admin to add Razorpay keys in Settings.</Text>
            )}
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
  noMatch: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.xs,
  },
  noMatchTitle: {
    marginTop: spacing.sm,
    fontSize: type.base,
    fontWeight: '800',
    color: colors.onSurface,
  },
  noMatchSub: { color: colors.muted, fontSize: type.sm },
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
  emptySub: {
    marginTop: 4,
    textAlign: 'center',
    color: colors.onSurfaceTertiary,
    fontSize: type.sm,
  },
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
  payBtn: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: colors.brand,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  payBtnText: { color: colors.brand, fontWeight: '800', fontSize: type.base },
  payHint: {
    marginTop: 4,
    textAlign: 'center',
    color: colors.muted,
    fontSize: type.sm,
  },
  draftBtn: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: colors.muted,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  draftBtnText: { color: colors.muted, fontWeight: '700', fontSize: type.base },
});

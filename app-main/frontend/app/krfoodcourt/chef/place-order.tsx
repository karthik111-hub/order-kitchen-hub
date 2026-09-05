import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api, MenuItem, OrderItem } from '@/src/api';
import { colors, radius, spacing, type, shadow } from '@/src/theme';

type CartItem = OrderItem & { tempId?: string };

export default function ChefOrderPage() {
  const router = useRouter();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [miscName, setMiscName] = useState('');
  const [miscPrice, setMiscPrice] = useState('');
  const [miscQty, setMiscQty] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadMenu = useCallback(async () => {
    try {
      const items = await api.listMenu(undefined, true);
      setMenuItems(items);
    } catch (e) {
      console.error('Error loading menu:', e);
      Alert.alert('Error', 'Failed to load menu items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const addToCart = (item: MenuItem, quantity: number = 1) => {
    setCart(prev => {
      const existing = prev.find(c => c.menu_item_id === item.id);
      if (existing) {
        return prev.map(c =>
          c.menu_item_id === item.id
            ? { ...c, quantity: c.quantity + quantity }
            : c
        );
      }
      return [...prev, {
        menu_item_id: item.id,
        name: item.name,
        price: item.price,
        old_price: item.old_price,
        quantity,
        image_base64: item.image_base64,
      }];
    });
  };

  const addMiscItem = () => {
    if (!miscName.trim()) {
      Alert.alert('Error', 'Please enter item name');
      return;
    }
    if (!miscPrice.trim() || isNaN(parseFloat(miscPrice))) {
      Alert.alert('Error', 'Please enter valid price');
      return;
    }
    const qty = parseInt(miscQty) || 1;
    
    setCart(prev => [...prev, {
      menu_item_id: `misc-${Date.now()}`,
      name: miscName,
      price: parseFloat(miscPrice),
      quantity: qty,
      tempId: `misc-${Date.now()}`,
    }]);
    
    setMiscName('');
    setMiscPrice('');
    setMiscQty('1');
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const updateCartQty = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(index);
    } else {
      setCart(prev => prev.map((item, i) =>
        i === index ? { ...item, quantity } : item
      ));
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const submitOrder = async () => {
    if (cart.length === 0) {
      Alert.alert('Error', 'Cart is empty');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createOrder({
        items: cart,
        table_number: tableNumber || undefined,
        notes: notes || undefined,
      });
      Alert.alert('Success', 'Order placed successfully', [
        {
          text: 'OK',
          onPress: () => {
            setCart([]);
            setTableNumber('');
            setNotes('');
            router.back();
          },
        },
      ]);
    } catch (e) {
      console.error('Error placing order:', e);
      Alert.alert('Error', 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={18} color={colors.brand} />
        </Pressable>
        <View style={styles.flex1}>
          <Text style={styles.title}>Place Order</Text>
          <Text style={styles.sub}>Add items from menu or misc</Text>
        </View>
      </View>

      <ScrollView style={styles.flex1} contentContainerStyle={{ paddingBottom: spacing.lg }}>
        {/* Menu Items Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Menu Items</Text>
          <View style={styles.menuGrid}>
            {menuItems.map(item => (
              <Pressable
                key={item.id}
                onPress={() => addToCart(item)}
                style={styles.menuCard}
              >
                <View style={styles.menuCardHeader}>
                  <Text style={styles.menuItemName} numberOfLines={2}>{item.name}</Text>
                </View>
                <View style={styles.menuCardFooter}>
                  <Text style={styles.menuPrice}>₹{item.price}</Text>
                  <Ionicons name="add-circle-outline" size={20} color={colors.brand} />
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Misc Item Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Misc Item</Text>
          <View style={styles.miscForm}>
            <TextInput
              placeholder="Item name"
              value={miscName}
              onChangeText={setMiscName}
              style={styles.input}
              placeholderTextColor={colors.muted}
            />
            <View style={styles.priceQtyRow}>
              <TextInput
                placeholder="Price"
                value={miscPrice}
                onChangeText={setMiscPrice}
                keyboardType="decimal-pad"
                style={[styles.input, styles.priceInput]}
                placeholderTextColor={colors.muted}
              />
              <TextInput
                placeholder="Qty"
                value={miscQty}
                onChangeText={setMiscQty}
                keyboardType="number-pad"
                style={[styles.input, styles.qtyInput]}
                placeholderTextColor={colors.muted}
              />
            </View>
            <Pressable
              onPress={addMiscItem}
              style={({ pressed }) => [
                styles.addMiscBtn,
                pressed && styles.btnPressed,
              ]}
            >
              <Ionicons name="add" size={18} color={colors.onBrandPrimary} />
              <Text style={styles.addMiscBtnText}>Add Misc Item</Text>
            </Pressable>
          </View>
        </View>

        {/* Order Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Details</Text>
          <TextInput
            placeholder="Table number (optional)"
            value={tableNumber}
            onChangeText={setTableNumber}
            style={styles.input}
            placeholderTextColor={colors.muted}
          />
          <TextInput
            placeholder="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            style={[styles.input, styles.notesInput]}
            multiline
            placeholderTextColor={colors.muted}
          />
        </View>

        {/* Cart Section */}
        {cart.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cart ({cart.length})</Text>
            {cart.map((item, index) => (
              <View key={index} style={styles.cartItem}>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName}>{item.name}</Text>
                  <Text style={styles.cartItemPrice}>₹{item.price}</Text>
                </View>
                <View style={styles.cartItemControls}>
                  <Pressable
                    onPress={() => updateCartQty(index, item.quantity - 1)}
                    style={styles.qtyBtn}
                  >
                    <Ionicons name="remove" size={16} color={colors.brand} />
                  </Pressable>
                  <Text style={styles.cartItemQty}>{item.quantity}</Text>
                  <Pressable
                    onPress={() => updateCartQty(index, item.quantity + 1)}
                    style={styles.qtyBtn}
                  >
                    <Ionicons name="add" size={16} color={colors.brand} />
                  </Pressable>
                  <Pressable
                    onPress={() => removeFromCart(index)}
                    style={styles.removeBtn}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.warning} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer - Total and Submit */}
      {cart.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalAmount}>₹{totalAmount.toFixed(2)}</Text>
          </View>
          <Pressable
            onPress={submitOrder}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.submitBtn,
              (pressed || isSubmitting) && styles.btnPressed,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.onBrandPrimary} />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={18} color={colors.onBrandPrimary} />
                <Text style={styles.submitBtnText}>Place Order</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: type.lg, fontWeight: '800', color: colors.onSurface },
  sub: { fontSize: type.sm, color: colors.muted, marginTop: 2 },
  flex1: { flex: 1 },

  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  sectionTitle: {
    fontSize: type.lg,
    fontWeight: '800',
    color: colors.onSurface,
    marginBottom: spacing.md,
  },

  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  menuCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.soft,
  },
  menuCardHeader: {
    marginBottom: spacing.sm,
  },
  menuItemName: {
    fontSize: type.sm,
    fontWeight: '700',
    color: colors.onSurface,
  },
  menuCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuPrice: {
    fontSize: type.base,
    fontWeight: '800',
    color: colors.brand,
  },

  miscForm: {
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: type.base,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  notesInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  priceQtyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  priceInput: {
    flex: 2,
  },
  qtyInput: {
    flex: 1,
  },
  addMiscBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadow.soft,
  },
  addMiscBtnText: {
    color: colors.onBrandPrimary,
    fontSize: type.base,
    fontWeight: '700',
  },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surfaceSecondary,
    gap: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: type.lg,
    fontWeight: '700',
    color: colors.onSurface,
  },
  totalAmount: {
    fontSize: type.xl,
    fontWeight: '800',
    color: colors.brand,
  },
  submitBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadow.soft,
  },
  submitBtnText: {
    color: colors.onBrandPrimary,
    fontSize: type.base,
    fontWeight: '800',
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },

  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: type.sm,
    fontWeight: '700',
    color: colors.onSurface,
  },
  cartItemPrice: {
    fontSize: type.sm,
    color: colors.muted,
    marginTop: 2,
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandTertiary,
  },
  cartItemQty: {
    fontSize: type.base,
    fontWeight: '700',
    color: colors.onSurface,
    minWidth: 24,
    textAlign: 'center',
  },
  removeBtn: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warning + '20',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

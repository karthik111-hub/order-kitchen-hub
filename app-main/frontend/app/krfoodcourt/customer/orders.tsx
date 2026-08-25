import { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { api, Order } from '@/src/api';
import { cartStore } from '@/src/cart';
import { colors, radius, spacing, type, shadow } from '@/src/theme';

const timeAgo = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
};

// Helper to get persistent customerId
const getPersistedCustomerId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('serveSync_customerId');
};

export default function CustomerOrders() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customerId] = useState(() => getPersistedCustomerId());

  const load = useCallback(async () => {
    try {
      if (!customerId) {
        console.warn('No customerId found');
        setOrders([]);
        setLoading(false);
        return;
      }
      console.log('Loading orders for customerId:', customerId);
      const allOrders = await api.listCustomerOrders(customerId);
      console.log('Loaded', allOrders.length, 'orders');
      setOrders(allOrders);
    } catch (e: any) {
      console.warn('Orders load failed', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [customerId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    load();
  }, [load]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'preparing':
        return colors.warning;
      case 'cancelled':
        return colors.error;
      default:
        return colors.muted;
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'preparing':
        return 'time';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'ellipsis-horizontal';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('serveSync_customerId');
    cartStore.clear();
    router.replace('/krfoodcourt' as any);
  };

  const renderOrder = ({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderNumber}># {item.token_number}</Text>
          <Text style={styles.orderTime}>
            {timeAgo(item.created_at)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + '22' }]}>
          <Ionicons name={statusIcon(item.status)} size={12} color={statusColor(item.status)} />
          <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.itemsList}>
        {item.items.map((it, idx) => (
          <View key={idx} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={styles.itemName}>
                {it.quantity}x {it.name}
              </Text>
            </View>
            <Text style={styles.itemPrice}>₹{(it.price * it.quantity).toFixed(0)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>₹{item.total.toFixed(0)}</Text>
      </View>

      {item.payment_status === 'paid' && (
        <View style={styles.paidBadge}>
          <Ionicons name="card" size={12} color={colors.success} />
          <Text style={styles.paidText}>Paid</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Your Orders</Text>
          <Text style={styles.subtitle}>{orders.length} order{orders.length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push('/krfoodcourt/customer' as any)}
            style={styles.actionBtn}
          >
            <Ionicons name="add-circle" size={18} color={colors.brand} />
          </Pressable>
          <Pressable
            onPress={handleLogout}
            style={styles.actionBtn}
          >
            <Ionicons name="log-out" size={18} color={colors.brand} />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="document-outline" size={28} color={colors.brand} />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptyText}>Start by placing an order from the menu</Text>
          <Pressable
            onPress={() => router.push('/krfoodcourt/customer' as any)}
            style={styles.browseBtn}
          >
            <Text style={styles.browseBtnText}>Browse Menu</Text>
            <Ionicons name="arrow-forward" size={12} color={colors.onBrandPrimary} />
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={o => o.id}
          renderItem={renderOrder}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + spacing.lg,
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: { fontSize: type.xxl, fontWeight: '800', color: colors.onSurface, letterSpacing: -0.5 },
  subtitle: { color: colors.muted, marginTop: 2, fontSize: type.sm },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  emptyTitle: { fontSize: type.lg, fontWeight: '800', color: colors.onSurface },
  emptyText: { color: colors.muted, fontSize: type.base },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
  },
  browseBtnText: { color: colors.onBrandPrimary, fontWeight: '800', fontSize: type.base },
  orderCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  orderNumber: { fontSize: type.lg, fontWeight: '800', color: colors.onSurface },
  orderTime: { fontSize: type.sm, color: colors.muted, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  statusText: { fontSize: type.xs, fontWeight: '800', letterSpacing: 0.3 },
  itemsList: { marginVertical: spacing.sm },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemName: { fontSize: type.base, color: colors.onSurface, fontWeight: '500' },
  itemPrice: { fontSize: type.base, color: colors.muted, fontWeight: '600' },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
  },
  totalLabel: { color: colors.onSurfaceTertiary, fontSize: type.base, fontWeight: '600' },
  totalAmount: { fontSize: type.lg, fontWeight: '800', color: colors.onSurface },
  paidBadge: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.success + '22',
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  paidText: { fontSize: type.xs, fontWeight: '800', color: colors.success, letterSpacing: 0.3 },
});

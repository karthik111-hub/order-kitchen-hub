import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { api, Order, OrderStatus } from '@/src/api';
import { colors, radius, spacing, type, shadow } from '@/src/theme';
import { confirm } from '@/src/utils/confirm';

const FILTERS: { key: 'all' | OrderStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const statusStyle = (s: OrderStatus) => {
  switch (s) {
    case 'pending':
      return { bg: '#FFF4E5', fg: colors.warning };
    case 'preparing':
      return { bg: colors.brandTertiary, fg: colors.brand };
    case 'completed':
      return { bg: '#E5F8EA', fg: colors.success };
    case 'cancelled':
      return { bg: '#FFE5E3', fg: colors.error };
  }
};

const timeAgo = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
};

export default function OrdersScreen() {
  const [filter, setFilter] = useState<'all' | OrderStatus>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.listOrders(filter === 'all' ? undefined : filter);
      setOrders(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      load();
      const id = setInterval(load, 5000);
      return () => clearInterval(id);
    }, [load]),
  );

  useEffect(() => {
    load();
  }, [load]);

  const cancelOrder = async (o: Order) => {
    const ok = await confirm(
      'Cancel order?',
      `Cancel order #${o.token_number || o.id.split('-').pop()}?`,
      { confirmLabel: 'Cancel Order', cancelLabel: 'Keep', destructive: true },
    );
    if (!ok) return;
    setOrders(prev =>
      prev.map(x => (x.id === o.id ? { ...x, status: 'cancelled' as const } : x)),
    );
    try {
      await api.updateStatus(o.id, 'cancelled');
      load();
    } catch (e: any) {
      Alert.alert('Failed to cancel', e?.message ?? 'Try again');
      load();
    }
  };

  const deleteOrder = async (o: Order) => {
    const ok = await confirm(
      'Delete order?',
      `Permanently delete order #${o.token_number || o.id.split('-').pop()}?`,
      { confirmLabel: 'Delete', cancelLabel: 'Cancel', destructive: true },
    );
    if (!ok) return;
    setOrders(prev => prev.filter(x => x.id !== o.id));
    try {
      await api.deleteOrder(o.id);
      load();
    } catch (e: any) {
      Alert.alert('Failed to delete', e?.message ?? 'Try again');
      load();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
        <Text style={styles.sub}>{orders.length} shown</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              testID={`orders-filter-${f.key}`}
              onPress={() => setFilter(f.key)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="receipt-outline" size={26} color={colors.brand} />
          </View>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySub}>Orders you place will show up here.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={o => o.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: 80 }}
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
          renderItem={({ item }) => {
            const sty = statusStyle(item.status);
            return (
              <View style={styles.card} testID={`order-card-${item.id}`}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderId}>#{item.token_number || item.id.split('-').pop() || item.id.slice(0, 8)}</Text>
                    <Text style={styles.orderTime}>{timeAgo(item.created_at)}</Text>
                  </View>
                  <View style={styles.actions}>
                    {item.status !== 'completed' && item.status !== 'cancelled' && (
                      <Pressable
                        testID={`cancel-order-link-${item.id}`}
                        onPress={() => cancelOrder(item)}
                        hitSlop={8}
                        style={styles.actionLink}
                      >
                        <Text style={styles.actionLinkText}>Cancel</Text>
                      </Pressable>
                    )}
                    <Pressable
                      testID={`delete-order-link-${item.id}`}
                      onPress={() => deleteOrder(item)}
                      hitSlop={8}
                      style={styles.actionLink}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </Pressable>
                  </View>
                </View>
                <View style={styles.pillsRow}>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor:
                            item.payment_status === 'paid'
                              ? '#E5F8EA'
                              : colors.surfaceTertiary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              item.payment_status === 'paid'
                                ? colors.success
                                : colors.muted,
                          },
                        ]}
                      >
                        {item.payment_status === 'paid' ? 'PAID' : 'UNPAID'}
                      </Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: sty.bg }]}>
                      <Text style={[styles.statusText, { color: sty.fg }]}>
                        {item.status.toUpperCase()}
                      </Text>
                    </View>
                </View>

                {item.table_number ? (
                  <View style={styles.metaRow}>
                    <Ionicons name="restaurant-outline" size={10} color={colors.muted} />
                    <Text style={styles.metaText}>Table {item.table_number}</Text>
                  </View>
                ) : null}

                <View style={{ marginTop: spacing.xs }}>
                  {item.items.map((li, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <Text style={styles.itemQty}>{li.quantity}×</Text>
                      <Text style={styles.itemName}>{li.name}</Text>
                      <Text style={styles.itemPrice}>₹{(li.price * li.quantity).toFixed(0)}</Text>
                    </View>
                  ))}
                </View>

                {item.notes ? <Text style={styles.notes}>Note: {item.notes}</Text> : null}

                <View style={styles.divider} />
                <View style={styles.rowBetween}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>₹{item.total.toFixed(0)}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
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
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadow.soft,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionLink: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  actionLinkText: {
    color: colors.error,
    fontSize: type.sm,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  orderId: { fontSize: type.lg, fontWeight: '800', color: colors.onSurface },
  orderTime: { color: colors.muted, fontSize: type.sm, marginTop: 2 },
  statusPill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  statusText: { fontSize: type.xs, fontWeight: '800', letterSpacing: 0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  metaText: { color: colors.onSurfaceTertiary, fontSize: type.sm },
  itemRow: { flexDirection: 'row', paddingVertical: 2, alignItems: 'center' },
  itemQty: { width: 22, color: colors.brand, fontWeight: '800', fontSize: type.sm },
  itemName: { flex: 1, color: colors.onSurface, fontSize: type.base },
  itemPrice: { color: colors.onSurfaceTertiary, fontSize: type.base, fontWeight: '600' },
  notes: { marginTop: spacing.xs, color: colors.onSurfaceTertiary, fontStyle: 'italic', fontSize: type.sm },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.sm },
  totalLabel: { color: colors.onSurfaceTertiary, fontSize: type.base, fontWeight: '600' },
  totalValue: { color: colors.onSurface, fontSize: type.lg, fontWeight: '800' },
});

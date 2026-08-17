import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { api, Order } from '@/src/api';
import { colors, radius, spacing, type, shadow } from '@/src/theme';

const ITEM_COL_WIDTH = 130;
const ORDER_COL_WIDTH = 78;
const TOTAL_COL_WIDTH = 68;
const ROW_HEIGHT = 40;

const shortId = (id: string) => id.split('-').pop() || id.slice(0, 8);

type Matrix = {
  orders: Order[];
  itemNames: string[];
  cells: Record<string, Record<string, number>>;
  totals: Record<string, number>;
  grandTotal: number;
};

const buildMatrix = (orders: Order[]): Matrix => {
  const cells: Record<string, Record<string, number>> = {};
  const totals: Record<string, number> = {};
  const nameSet = new Set<string>();
  let grand = 0;
  for (const o of orders) {
    for (const li of o.items) {
      nameSet.add(li.name);
      if (!cells[li.name]) cells[li.name] = {};
      cells[li.name][o.id] = (cells[li.name][o.id] || 0) + li.quantity;
      totals[li.name] = (totals[li.name] || 0) + li.quantity;
      grand += li.quantity;
    }
  }
  const itemNames = Array.from(nameSet).sort();
  return { orders, itemNames, cells, totals, grandTotal: grand };
};

export default function ChefPending() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.listOrders('pending');
      setOrders(data.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ));
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const id = setInterval(load, 4000);
      return () => clearInterval(id);
    }, [load]),
  );

  useEffect(() => {
    load();
  }, [load]);

  const matrix = useMemo(() => buildMatrix(orders), [orders]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await api.updateStatus(orderId, newStatus as any);
      load();
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Pending Orders</Text>
          <Text style={styles.sub}>{orders.length} orders waiting</Text>
        </View>
        <Pressable
          testID="chef-switch-role-btn"
          onPress={() => router.replace('/' as any)}
          style={styles.switchBtn}
        >
          <Ionicons name="swap-horizontal" size={14} color={colors.brand} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : matrix.itemNames.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="hourglass-outline" size={26} color={colors.brand} />
          </View>
          <Text style={styles.emptyTitle}>No pending orders</Text>
          <Text style={styles.emptySub}>All orders are either being prepared or complete.</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator
          contentContainerStyle={{ paddingBottom: 20 }}
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
        >
          {/* Board Matrix Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Board Matrix</Text>
            <View style={styles.legendRow}>
              <View style={[styles.legendPill, { backgroundColor: '#FFF4E5' }]}>
                <View style={[styles.dot, { backgroundColor: colors.warning }]} />
                <Text style={styles.legendText}>Pending</Text>
              </View>
              <Text style={styles.grandText}>Total items: {matrix.grandTotal}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator
              contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}
            >
              <View testID="pending-matrix">
                {/* Header row */}
                <View style={styles.headerRow}>
                  <View style={[styles.headerCell, { width: ITEM_COL_WIDTH }]}>
                    <Text style={styles.headerCellText}>Item</Text>
                  </View>
                  {matrix.orders.map(o => (
                    <View
                      key={o.id}
                      style={[
                        styles.headerCell,
                        {
                          width: ORDER_COL_WIDTH,
                          backgroundColor: '#FFF4E5',
                        },
                      ]}
                      testID={`pending-col-${o.id}`}
                    >
                      <Text
                        style={[
                          styles.headerCellText,
                          { color: colors.warning },
                        ]}
                        numberOfLines={1}
                      >
                        #{o.token_number}
                      </Text>
                      {o.table_number ? (
                        <Text style={styles.headerSubText} numberOfLines={1}>
                          T-{o.table_number}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                  <View
                    style={[styles.headerCell, styles.totalCell, { width: TOTAL_COL_WIDTH }]}
                  >
                    <Text style={[styles.headerCellText, { color: colors.onBrandPrimary }]}>
                      Total
                    </Text>
                  </View>
                </View>

                {/* Item rows */}
                <ScrollView>
                  {matrix.itemNames.map((name, rowIdx) => (
                    <View
                      key={name}
                      style={[
                        styles.row,
                        { backgroundColor: rowIdx % 2 === 0 ? colors.surfaceSecondary : '#FCFCFB' },
                      ]}
                      testID={`pending-row-${name}`}
                    >
                      <View style={[styles.itemCell, { width: ITEM_COL_WIDTH }]}>
                        <Text style={styles.itemNameText} numberOfLines={2}>
                          {name}
                        </Text>
                      </View>
                      {matrix.orders.map(o => {
                        const qty = matrix.cells[name]?.[o.id] || 0;
                        return (
                          <View
                            key={o.id}
                            style={[styles.qtyCell, { width: ORDER_COL_WIDTH }]}
                          >
                            {qty > 0 ? (
                              <Text style={styles.qtyText}>{qty}</Text>
                            ) : (
                              <Text style={styles.dashText}>–</Text>
                            )}
                          </View>
                        );
                      })}
                      <View style={[styles.qtyCell, styles.totalCell, { width: TOTAL_COL_WIDTH }]}>
                        <Text style={styles.totalCellText}>{matrix.totals[name]}</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>
          </View>

          {/* Order List Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Details</Text>
            {orders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={styles.flex1}>
                    <Text style={styles.orderId}>#{order.token_number}</Text>
                    {order.table_number && (
                      <Text style={styles.tableNumber}>Table {order.table_number}</Text>
                    )}
                  </View>
                  <Text style={styles.total}>₹{order.total.toFixed(2)}</Text>
                </View>

                {/* Order Items */}
                <View style={styles.itemsList}>
                  {order.items.map((item, idx) => (
                    <View key={idx} style={styles.orderItem}>
                      <Text style={styles.itemQty}>{item.quantity}×</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemPrice}>₹{item.price.toFixed(2)}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Order Notes */}
                {order.notes && (
                  <View style={styles.notesSection}>
                    <Text style={styles.notesLabel}>Notes:</Text>
                    <Text style={styles.notesText}>{order.notes}</Text>
                  </View>
                )}

                {/* Action Button */}
                <Pressable
                  style={styles.actionButton}
                  onPress={() => handleStatusChange(order.id, 'preparing')}
                >
                  <Ionicons name="flame" size={16} color="white" />
                  <Text style={styles.actionButtonText}>Start Preparing</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
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
  switchBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: type.lg,
    fontWeight: '800',
    color: colors.onSurface,
    marginBottom: spacing.md,
  },

  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  legendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { color: colors.onSurfaceTertiary, fontSize: type.sm, fontWeight: '600' },
  grandText: { color: colors.muted, fontSize: type.sm, fontWeight: '700', marginLeft: 'auto' },

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
  emptySub: {
    marginTop: 4,
    color: colors.onSurfaceTertiary,
    textAlign: 'center',
    fontSize: type.sm,
  },

  headerRow: {
    flexDirection: 'row',
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    overflow: 'hidden',
    ...shadow.soft,
  },
  headerCell: {
    height: 48,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.divider,
    backgroundColor: colors.surfaceTertiary,
  },
  headerCellText: { fontSize: type.sm, fontWeight: '800', color: colors.onSurface },
  headerSubText: { fontSize: type.xs, color: colors.muted, marginTop: 1, fontWeight: '600' },

  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  itemCell: {
    height: 40,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.divider,
  },
  itemNameText: { fontSize: type.sm, fontWeight: '700', color: colors.onSurface },
  qtyCell: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.divider,
  },
  qtyText: { fontSize: type.lg, fontWeight: '800', color: colors.onSurface },
  dashText: { fontSize: type.base, color: colors.muted },
  totalCell: {
    backgroundColor: colors.brand,
  },
  totalCellText: { color: colors.onBrandPrimary, fontSize: type.lg, fontWeight: '800' },

  // Order Card Styles
  orderCard: {
    backgroundColor: '#FFF4E5',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    ...shadow.soft,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  orderId: {
    fontSize: type.base,
    fontWeight: '800',
    color: colors.onSurface,
  },
  tableNumber: {
    fontSize: type.sm,
    color: colors.muted,
    marginTop: 2,
  },
  total: {
    fontSize: type.lg,
    fontWeight: '800',
    color: colors.warning,
  },
  itemsList: {
    marginBottom: spacing.md,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  itemQty: {
    fontSize: type.base,
    fontWeight: '800',
    color: colors.brand,
    marginRight: spacing.sm,
    width: 30,
  },
  itemName: {
    fontSize: type.base,
    fontWeight: '600',
    color: colors.onSurface,
  },
  itemPrice: {
    fontSize: type.sm,
    color: colors.muted,
    marginTop: 2,
  },
  notesSection: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  notesLabel: {
    fontSize: type.sm,
    fontWeight: '700',
    color: colors.muted,
  },
  notesText: {
    fontSize: type.sm,
    color: colors.onSurface,
    marginTop: 4,
  },
  actionButton: {
    backgroundColor: colors.warning,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  actionButtonText: {
    color: 'white',
    fontSize: type.base,
    fontWeight: '700',
  },
});

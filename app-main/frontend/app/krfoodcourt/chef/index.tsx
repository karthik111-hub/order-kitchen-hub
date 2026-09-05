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

export default function ChefDashboard() {
  const router = useRouter();
  const [pending, setPending] = useState<Order[]>([]);
  const [preparing, setPreparing] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, q] = await Promise.all([
        api.listOrders('pending'),
        api.listOrders('preparing'),
      ]);
      setPending(p);
      setPreparing(q);
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

  const active = useMemo(() => {
    const sortAsc = (a: Order, b: Order) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return [...preparing].sort(sortAsc).concat([...pending].sort(sortAsc));
  }, [pending, preparing]);

  const matrix = useMemo(() => buildMatrix(active), [active]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Kitchen Board</Text>
          <Text style={styles.sub}>
            {preparing.length} preparing · {pending.length} pending
          </Text>
        </View>
        <Pressable
          testID="chef-place-order-btn"
          onPress={() => router.push('/krfoodcourt/chef/place-order' as any)}
          style={styles.placeOrderBtn}
        >
          <Ionicons name="add" size={18} color={colors.onBrandPrimary} />
        </Pressable>
        <Pressable
          testID="chef-sales-btn"
          onPress={() => router.push('/krfoodcourt/chef/sales' as any)}
          style={styles.headerBtn}
        >
          <Ionicons name="stats-chart-outline" size={14} color={colors.brand} />
        </Pressable>
        <Pressable
          testID="chef-switch-role-btn"
          onPress={() => router.replace('/' as any)}
          style={styles.headerBtn}
        >
          <Ionicons name="swap-horizontal" size={14} color={colors.brand} />
        </Pressable>
      </View>

      <View style={styles.legendRow}>
        <View style={[styles.legendPill, { backgroundColor: colors.brandTertiary }]}>
          <View style={[styles.dot, { backgroundColor: colors.brand }]} />
          <Text style={styles.legendText}>Preparing</Text>
        </View>
        <View style={[styles.legendPill, { backgroundColor: '#FFF4E5' }]}>
          <View style={[styles.dot, { backgroundColor: colors.warning }]} />
          <Text style={styles.legendText}>Pending</Text>
        </View>
        <Text style={styles.grandText}>Total items: {matrix.grandTotal}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : matrix.itemNames.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="grid-outline" size={26} color={colors.brand} />
          </View>
          <Text style={styles.emptyTitle}>Board is empty</Text>
          <Text style={styles.emptySub}>
            No pending or in-progress orders right now.
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 90 }}
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
          <View testID="dashboard-matrix">
            {/* Header row */}
            <View style={styles.headerRow}>
              <View style={[styles.headerCell, { width: ITEM_COL_WIDTH }]}>
                <Text style={styles.headerCellText}>Item</Text>
              </View>
              {matrix.orders.map(o => {
                const isPreparing = o.status === 'preparing';
                return (
                  <View
                    key={o.id}
                    style={[
                      styles.headerCell,
                      {
                        width: ORDER_COL_WIDTH,
                        backgroundColor: isPreparing ? colors.brandTertiary : '#FFF4E5',
                      },
                    ]}
                    testID={`dash-col-${o.id}`}
                  >
                    <Text
                      style={[
                        styles.headerCellText,
                        { color: isPreparing ? colors.brand : colors.warning },
                      ]}
                      numberOfLines={1}
                    >
                      #{shortId(o.id)}
                    </Text>
                    {o.table_number ? (
                      <Text style={styles.headerSubText} numberOfLines={1}>
                        T-{o.table_number}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
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
                  testID={`dash-row-${name}`}
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
    gap: spacing.sm,
  },
  title: { fontSize: type.xxl, fontWeight: '800', color: colors.onSurface, letterSpacing: -0.5 },
  sub: { color: colors.muted, marginTop: 2, fontSize: type.sm },
  headerBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeOrderBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
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
    height: ROW_HEIGHT + 8,
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
    height: ROW_HEIGHT,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.divider,
  },
  itemNameText: { fontSize: type.sm, fontWeight: '700', color: colors.onSurface },
  qtyCell: {
    height: ROW_HEIGHT,
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
});

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

type ItemSummaryRow = {
  name: string;
  quantity: number;
  revenue: number;
};

type Summary = {
  totalOrders: number;
  totalItems: number;
  totalRevenue: number;
  rows: ItemSummaryRow[];
};

const buildSummary = (orders: Order[]): Summary => {
  const byName: Record<string, ItemSummaryRow> = {};
  let totalItems = 0;
  let totalRevenue = 0;
  for (const o of orders) {
    totalRevenue += o.total;
    for (const li of o.items) {
      if (!byName[li.name]) byName[li.name] = { name: li.name, quantity: 0, revenue: 0 };
      byName[li.name].quantity += li.quantity;
      byName[li.name].revenue += li.price * li.quantity;
      totalItems += li.quantity;
    }
  }
  const rows = Object.values(byName).sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));
  return { totalOrders: orders.length, totalItems, totalRevenue, rows };
};

export default function ChefCompleted() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.listOrders('completed');
      setOrders(data);
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

  const summary = useMemo(() => buildSummary(orders), [orders]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.flex1}>
          <Text style={styles.title}>Completed Orders</Text>
          <Text style={styles.sub}>{orders.length} orders done</Text>
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
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="checkmark-done-outline" size={26} color={colors.brand} />
          </View>
          <Text style={styles.emptyTitle}>No completed orders</Text>
          <Text style={styles.emptySub}>Orders will appear here once they're done.</Text>
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
          {/* Summary stat cards */}
          <View style={styles.section}>
            <View style={styles.statsRow}>
              <View style={styles.statCard} testID="completed-stat-orders">
                <Text style={styles.statValue}>{summary.totalOrders}</Text>
                <Text style={styles.statLabel}>Orders</Text>
              </View>
              <View style={styles.statCard} testID="completed-stat-items">
                <Text style={styles.statValue}>{summary.totalItems}</Text>
                <Text style={styles.statLabel}>Items</Text>
              </View>
              <View style={styles.statCard} testID="completed-stat-revenue">
                <Text style={styles.statValue}>₹{summary.totalRevenue.toFixed(0)}</Text>
                <Text style={styles.statLabel}>Revenue</Text>
              </View>
            </View>
          </View>

          {/* Consolidated item breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Items Served</Text>
            <View style={styles.table} testID="completed-summary-table">
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderText, styles.itemCol]}>Item</Text>
                <Text style={[styles.tableHeaderText, styles.qtyCol]}>Qty</Text>
                <Text style={[styles.tableHeaderText, styles.revenueCol]}>Revenue</Text>
              </View>
              {summary.rows.map((row, idx) => (
                <View
                  key={row.name}
                  style={[
                    styles.tableRow,
                    { backgroundColor: idx % 2 === 0 ? colors.surfaceSecondary : '#FCFCFB' },
                  ]}
                  testID={`completed-summary-row-${row.name}`}
                >
                  <Text style={[styles.tableCellText, styles.itemCol]} numberOfLines={2}>
                    {row.name}
                  </Text>
                  <Text style={[styles.tableCellText, styles.qtyCol, styles.qtyValue]}>
                    {row.quantity}
                  </Text>
                  <Text style={[styles.tableCellText, styles.revenueCol]}>
                    ₹{row.revenue.toFixed(0)}
                  </Text>
                </View>
              ))}
              <View style={styles.tableFooterRow}>
                <Text style={[styles.tableFooterText, styles.itemCol]}>Total</Text>
                <Text style={[styles.tableFooterText, styles.qtyCol, styles.qtyValue]}>
                  {summary.totalItems}
                </Text>
                <Text style={[styles.tableFooterText, styles.revenueCol]}>
                  ₹{summary.totalRevenue.toFixed(0)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Pressable
              testID="view-individual-orders-btn"
              style={styles.detailsBtn}
              onPress={() => router.push('/krfoodcourt/chef/completed-details' as any)}
            >
              <Ionicons name="list-outline" size={16} color={colors.brand} />
              <Text style={styles.detailsBtnText}>View Individual Orders</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.brand} />
            </Pressable>
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

  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#E8F5E9',
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    ...shadow.soft,
  },
  statValue: {
    fontSize: type.xxl,
    fontWeight: '800',
    color: colors.success,
  },
  statLabel: {
    marginTop: 2,
    fontSize: type.sm,
    fontWeight: '700',
    color: colors.onSurfaceTertiary,
  },

  table: {
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadow.soft,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceTertiary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  tableHeaderText: { fontSize: type.sm, fontWeight: '800', color: colors.onSurface },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  tableCellText: { fontSize: type.base, color: colors.onSurface, fontWeight: '600' },
  tableFooterRow: {
    flexDirection: 'row',
    backgroundColor: colors.brandTertiary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  tableFooterText: { fontSize: type.base, fontWeight: '800', color: colors.brand },
  itemCol: { flex: 1 },
  qtyCol: { width: 60, textAlign: 'right' },
  qtyValue: { fontWeight: '800' },
  revenueCol: { width: 90, textAlign: 'right' },
  flex1: { flex: 1 },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brandTertiary,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  detailsBtnText: { color: colors.brand, fontWeight: '800', fontSize: type.base },
});

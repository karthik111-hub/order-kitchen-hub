import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { api, Order } from '@/src/api';
import { colors, radius, spacing, type, shadow } from '@/src/theme';

const shortId = (id: string) => id.split('-').pop() || id.slice(0, 8);

const formatDateIST = (utcTime: string) => {
  try {
    const date = new Date(utcTime);
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour12: false,
    });
    return formatter.format(date);
  } catch (e) {
    return '';
  }
};

const getDateKey = (utcTime: string) => {
  try {
    const date = new Date(utcTime);
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch (e) {
    return '';
  }
};

type DaySales = {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  paidRevenue: number;
  unpaidRevenue: number;
  completedOrders: number;
  pendingOrders: number;
};

const buildDailySales = (orders: Order[]): { daily: DaySales[]; today: DaySales } => {
  const daily: Record<string, DaySales> = {};
  let today: DaySales = {
    date: new Date().toISOString().split('T')[0],
    totalOrders: 0,
    totalRevenue: 0,
    paidRevenue: 0,
    unpaidRevenue: 0,
    completedOrders: 0,
    pendingOrders: 0,
  };

  for (const o of orders) {
    const dateKey = getDateKey(o.created_at);
    if (!dateKey) continue;

    if (!daily[dateKey]) {
      daily[dateKey] = {
        date: dateKey,
        totalOrders: 0,
        totalRevenue: 0,
        paidRevenue: 0,
        unpaidRevenue: 0,
        completedOrders: 0,
        pendingOrders: 0,
      };
    }

    daily[dateKey].totalOrders++;
    daily[dateKey].totalRevenue += o.total;
    if (o.payment_status === 'paid') {
      daily[dateKey].paidRevenue += o.total;
    } else {
      daily[dateKey].unpaidRevenue += o.total;
    }
    if (o.status === 'completed') {
      daily[dateKey].completedOrders++;
    } else {
      daily[dateKey].pendingOrders++;
    }

    // Update today if this order is from today
    if (dateKey === today.date) {
      today.totalOrders++;
      today.totalRevenue += o.total;
      if (o.payment_status === 'paid') {
        today.paidRevenue += o.total;
      } else {
        today.unpaidRevenue += o.total;
      }
      if (o.status === 'completed') {
        today.completedOrders++;
      } else {
        today.pendingOrders++;
      }
    }
  }

  // Sort dates descending
  const sortedDaily = Object.values(daily).sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB.getTime() - dateA.getTime();
  });

  return { daily: sortedDaily, today };
};

const getWeeklyData = (dailySales: DaySales[]) => {
  const week = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayData = dailySales.find(d => d.date === dateStr);
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    week.push({
      day: dayNames[date.getDay()],
      revenue: dayData?.totalRevenue || 0,
      orders: dayData?.totalOrders || 0,
    });
  }
  
  return week;
};

export default function SalesDashboard() {
  const router = useRouter();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.listOrders();
      setAllOrders(data);
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
      const id = setInterval(load, 5000);
      return () => clearInterval(id);
    }, [load]),
  );

  useEffect(() => {
    load();
  }, [load]);

  const { daily, today } = buildDailySales(allOrders);
  const weeklyData = getWeeklyData(daily);
  
  // Find max revenue for chart scaling
  const maxRevenue = Math.max(...weeklyData.map(w => w.revenue), 1);
  const chartHeight = 120;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Sales Dashboard</Text>
          <Text style={styles.sub}>Today's revenue and weekly trends</Text>
        </View>
        <Pressable
          testID="sales-back-btn"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={18} color={colors.brand} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
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
          {/* Today's Summary Card */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryIcon}>
                  <Ionicons name="wallet-outline" size={20} color={colors.brand} />
                </View>
                <Text style={styles.summaryValue}>₹{today.totalRevenue.toFixed(0)}</Text>
                <Text style={styles.summaryLabel}>Total Revenue</Text>
              </View>

              <View style={styles.summaryCard}>
                <View style={styles.summaryIcon}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
                </View>
                <Text style={styles.summaryValue}>{today.completedOrders}</Text>
                <Text style={styles.summaryLabel}>Completed Orders</Text>
              </View>

              <View style={styles.summaryCard}>
                <View style={styles.summaryIcon}>
                  <Ionicons name="list-outline" size={20} color={colors.warning} />
                </View>
                <Text style={styles.summaryValue}>{today.totalOrders}</Text>
                <Text style={styles.summaryLabel}>Total Orders</Text>
              </View>

              <View style={styles.summaryCard}>
                <View style={styles.summaryIcon}>
                  <Ionicons name="card-outline" size={20} color={colors.info} />
                </View>
                <Text style={styles.summaryValue}>₹{today.paidRevenue.toFixed(0)}</Text>
                <Text style={styles.summaryLabel}>Paid Revenue</Text>
              </View>
            </View>
          </View>

          {/* Weekly Chart */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weekly Revenue Trend</Text>
            <View style={styles.chartContainer}>
              <View style={styles.chart}>
                {weeklyData.map((day, idx) => (
                  <View key={idx} style={styles.barContainer}>
                    <View style={styles.barWrapper}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: (day.revenue / maxRevenue) * chartHeight,
                            backgroundColor: day.revenue > 0 ? colors.brand : colors.surfaceSecondary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel}>{day.day}</Text>
                    {day.revenue > 0 && (
                      <Text style={styles.barValue}>₹{Math.round(day.revenue)}</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Weekly Orders Trend */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weekly Orders Trend</Text>
            <View style={styles.trendGrid}>
              {weeklyData.map((day, idx) => (
                <View key={idx} style={styles.trendCard}>
                  <Text style={styles.trendDay}>{day.day}</Text>
                  <Text style={styles.trendOrders}>{day.orders}</Text>
                  <Text style={styles.trendLabel}>Orders</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Daily Sales List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Sales History</Text>
            {daily.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No sales data available</Text>
              </View>
            ) : (
              daily.map((day) => (
                <View key={day.date} style={styles.dailyCard}>
                  <View style={styles.dailyHeader}>
                    <View>
                      <Text style={styles.dailyDate}>{day.date}</Text>
                      <Text style={styles.dailyOrders}>{day.totalOrders} orders</Text>
                    </View>
                    <View style={styles.dailyRight}>
                      <Text style={styles.dailyRevenue}>₹{day.totalRevenue.toFixed(0)}</Text>
                      <View style={styles.dailyStats}>
                        <View style={styles.statBadge}>
                          <Text style={styles.statBadgeText}>✓ {day.completedOrders}</Text>
                        </View>
                        <View style={[styles.statBadge, { backgroundColor: colors.warning + '20' }]}>
                          <Text style={[styles.statBadgeText, { color: colors.warning }]}>
                            ⧖ {day.pendingOrders}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={styles.dailyPaidRow}>
                    <View style={styles.revenueBreakdown}>
                      <Text style={styles.revenueLabel}>
                        Paid: <Text style={styles.revenueValue}>₹{day.paidRevenue.toFixed(0)}</Text>
                      </Text>
                      <Text style={styles.revenueLabel}>
                        Unpaid: <Text style={[styles.revenueValue, { color: colors.warning }]}>
                          ₹{day.unpaidRevenue.toFixed(0)}
                        </Text>
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
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
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: type.xxl, fontWeight: '800', color: colors.onSurface, letterSpacing: -0.5 },
  sub: { color: colors.muted, marginTop: 2, fontSize: type.sm },

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

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadow.soft,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  summaryValue: {
    fontSize: type.lg,
    fontWeight: '800',
    color: colors.onSurface,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: type.xs,
    color: colors.muted,
    textAlign: 'center',
  },

  chartContainer: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.soft,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 160,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
  },
  barWrapper: {
    width: 28,
    height: 120,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: radius.sm,
    minHeight: 4,
  },
  barLabel: {
    fontSize: type.xs,
    fontWeight: '600',
    color: colors.muted,
  },
  barValue: {
    fontSize: type.xs,
    fontWeight: '700',
    color: colors.brand,
  },

  trendGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  trendCard: {
    flex: 1,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    ...shadow.soft,
  },
  trendDay: {
    fontSize: type.sm,
    fontWeight: '700',
    color: colors.muted,
  },
  trendOrders: {
    fontSize: type.lg,
    fontWeight: '800',
    color: colors.brand,
    marginVertical: 4,
  },
  trendLabel: {
    fontSize: type.xs,
    color: colors.muted,
  },

  dailyCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.brand,
    ...shadow.soft,
  },
  dailyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  dailyDate: {
    fontSize: type.base,
    fontWeight: '800',
    color: colors.onSurface,
  },
  dailyOrders: {
    fontSize: type.sm,
    color: colors.muted,
    marginTop: 4,
  },
  dailyRight: {
    alignItems: 'flex-end',
  },
  dailyRevenue: {
    fontSize: type.lg,
    fontWeight: '800',
    color: colors.brand,
  },
  dailyStats: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  statBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.success + '20',
  },
  statBadgeText: {
    fontSize: type.xs,
    fontWeight: '700',
    color: colors.success,
  },
  dailyPaidRow: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  revenueBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  revenueLabel: {
    fontSize: type.sm,
    color: colors.muted,
  },
  revenueValue: {
    fontWeight: '700',
    color: colors.brand,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: type.base,
    color: colors.muted,
  },
});

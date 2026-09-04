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

const getDateKey = (utcTime: string) => {
  try {
    const date = new Date(utcTime);
    
    // Get IST date (UTC+5:30)
    const istTime = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
    const year = istTime.getUTCFullYear();
    const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(istTime.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.warn('Error parsing date:', utcTime, e);
    return '';
  }
};

const getTodayDateKey = () => {
  const now = new Date();
  const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const year = istTime.getUTCFullYear();
  const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istTime.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

const getMonthKey = (utcTime: string) => {
  try {
    const date = new Date(utcTime);
    const istTime = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
    const year = istTime.getUTCFullYear();
    const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
    
    return `${year}-${month}`;
  } catch (e) {
    return '';
  }
};

const getCurrentMonthKey = () => {
  const now = new Date();
  const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const year = istTime.getUTCFullYear();
  const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
  
  return `${year}-${month}`;
};

type DaySales = {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  completedOrders: number;
  pendingOrders: number;
};

type MonthlySales = {
  month: string;
  totalOrders: number;
  totalRevenue: number;
  completedOrders: number;
  pendingOrders: number;
};

const buildDailySales = (orders: Order[]): { daily: DaySales[]; today: DaySales } => {
  const daily: Record<string, DaySales> = {};
  const todayDateKey = getTodayDateKey();
  
  let today: DaySales = {
    date: todayDateKey,
    totalOrders: 0,
    totalRevenue: 0,
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
        completedOrders: 0,
        pendingOrders: 0,
      };
    }

    daily[dateKey].totalOrders++;
    daily[dateKey].totalRevenue += o.total;
    if (o.status === 'completed') {
      daily[dateKey].completedOrders++;
    } else {
      daily[dateKey].pendingOrders++;
    }

    if (dateKey === todayDateKey) {
      today.totalOrders++;
      today.totalRevenue += o.total;
      if (o.status === 'completed') {
        today.completedOrders++;
      } else {
        today.pendingOrders++;
      }
    }
  }

  const sortedDaily = Object.values(daily).sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB.getTime() - dateA.getTime();
  });

  return { daily: sortedDaily, today };
};

const buildMonthlySales = (orders: Order[]): MonthlySales[] => {
  const monthly: Record<string, MonthlySales> = {};

  for (const o of orders) {
    const monthKey = getMonthKey(o.created_at);
    if (!monthKey) continue;

    if (!monthly[monthKey]) {
      monthly[monthKey] = {
        month: monthKey,
        totalOrders: 0,
        totalRevenue: 0,
        completedOrders: 0,
        pendingOrders: 0,
      };
    }

    monthly[monthKey].totalOrders++;
    monthly[monthKey].totalRevenue += o.total;
    if (o.status === 'completed') {
      monthly[monthKey].completedOrders++;
    } else {
      monthly[monthKey].pendingOrders++;
    }
  }

  const sortedMonthly = Object.values(monthly).sort((a, b) => {
    return b.month.localeCompare(a.month);
  });

  return sortedMonthly;
};

const getWeeklyData = (dailySales: DaySales[]) => {
  const week = [];
  const now = new Date();
  const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(istNow);
    date.setUTCDate(date.getUTCDate() - i);
    
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const dayData = dailySales.find(d => d.date === dateStr);
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayIndex = date.getUTCDay();
    
    week.push({
      day: dayNames[dayIndex],
      revenue: dayData?.totalRevenue || 0,
      orders: dayData?.totalOrders || 0,
    });
  }
  
  return week;
};

const getMonthName = (monthKey: string) => {
  const [year, month] = monthKey.split('-');
  const date = new Date(`${year}-${month}-01`);
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
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
      console.error('Error loading orders:', e);
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
  const monthly = buildMonthlySales(allOrders);
  const weeklyData = getWeeklyData(daily);
  
  // Find max revenue for chart scaling
  const maxRevenue = Math.max(...weeklyData.map(w => w.revenue), 1);
  const maxMonthlyRevenue = Math.max(...monthly.map(m => m.totalRevenue), 1);
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
                  <Ionicons name="hourglass-outline" size={20} color={colors.info} />
                </View>
                <Text style={styles.summaryValue}>{today.pendingOrders}</Text>
                <Text style={styles.summaryLabel}>Pending Orders</Text>
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

          {/* Monthly Chart */}
          {monthly.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Monthly Revenue Trend</Text>
              <View style={styles.chartContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View style={styles.monthlyChart}>
                    {monthly.map((m, idx) => (
                      <View key={idx} style={styles.barContainer}>
                        <View style={styles.barWrapper}>
                          <View
                            style={[
                              styles.bar,
                              {
                                height: (m.totalRevenue / maxMonthlyRevenue) * chartHeight,
                                backgroundColor: m.totalRevenue > 0 ? colors.brand : colors.surfaceSecondary,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.monthBarLabel}>{getMonthName(m.month)}</Text>
                        {m.totalRevenue > 0 && (
                          <Text style={styles.barValue}>₹{Math.round(m.totalRevenue)}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>
          )}

          {/* Monthly Orders Breakdown */}
          {monthly.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Monthly Orders Breakdown</Text>
              {monthly.map((m) => (
                <View key={m.month} style={styles.monthlyCard}>
                  <View style={styles.monthlyHeader}>
                    <View>
                      <Text style={styles.monthlyDate}>{getMonthName(m.month)}</Text>
                      <Text style={styles.monthlyOrders}>{m.totalOrders} orders</Text>
                    </View>
                    <View style={styles.monthlyRight}>
                      <Text style={styles.monthlyRevenue}>₹{m.totalRevenue.toFixed(0)}</Text>
                      <View style={styles.monthlyStats}>
                        <View style={styles.statBadge}>
                          <Text style={styles.statBadgeText}>✓ {m.completedOrders}</Text>
                        </View>
                        <View style={[styles.statBadge, { backgroundColor: colors.warning + '20' }]}>
                          <Text style={[styles.statBadgeText, { color: colors.warning }]}>
                            ⧖ {m.pendingOrders}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
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
  monthlyChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 160,
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
    minWidth: 50,
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
  monthBarLabel: {
    fontSize: type.xs,
    fontWeight: '600',
    color: colors.muted,
    textAlign: 'center',
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

  monthlyCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.brand,
    ...shadow.soft,
  },
  monthlyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  monthlyDate: {
    fontSize: type.base,
    fontWeight: '800',
    color: colors.onSurface,
  },
  monthlyOrders: {
    fontSize: type.sm,
    color: colors.muted,
    marginTop: 4,
  },
  monthlyRight: {
    alignItems: 'flex-end',
  },
  monthlyRevenue: {
    fontSize: type.lg,
    fontWeight: '800',
    color: colors.brand,
  },
  monthlyStats: {
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

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

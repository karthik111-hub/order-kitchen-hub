import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { api, Order, OrderStatus } from '@/src/api';
import { colors, radius, spacing, type, shadow } from '@/src/theme';
import { confirm } from '@/src/utils/confirm';

type Props = {
  status: OrderStatus;
  title: string;
  emptyText: string;
  emptyIcon: keyof typeof Ionicons.glyphMap;
  action?: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    nextStatus: OrderStatus;
    color: string;
  };
  showBackHome?: boolean;
};

const timeAgo = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s`;
  if (diff < 3600) return `${Math.round(diff / 60)}m`;
  return `${Math.round(diff / 3600)}h`;
};

const urgencyColor = (iso: string) => {
  const mins = (Date.now() - new Date(iso).getTime()) / 60000;
  if (mins > 15) return colors.error;
  if (mins > 8) return colors.warning;
  return colors.success;
};

export default function TicketList({
  status,
  title,
  emptyText,
  emptyIcon,
  action,
  showBackHome,
}: Props) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.listOrders(status);
      setOrders(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status]);

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

  const updateStatus = async (id: string, next: OrderStatus) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setOrders(prev => prev.filter(o => o.id !== id));
      await api.updateStatus(id, next);
    } catch (e: any) {
      Alert.alert('Update failed', e?.message ?? 'Try again');
      load();
    }
  };

  const cancelTicket = async (id: string) => {
    const ok = await confirm(
      'Cancel this order?',
      'This will remove it from the kitchen queue.',
      { confirmLabel: 'Cancel Order', cancelLabel: 'Keep', destructive: true },
    );
    if (ok) updateStatus(id, 'cancelled');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>{orders.length} tickets</Text>
        </View>
        {showBackHome && (
          <Pressable
            testID="chef-switch-role-btn"
            onPress={() => router.replace('/' as any)}
            style={styles.switchBtn}
          >
            <Ionicons name="swap-horizontal" size={14} color={colors.brand} />
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name={emptyIcon} size={26} color={colors.brand} />
          </View>
          <Text style={styles.emptyTitle}>All clear</Text>
          <Text style={styles.emptySub}>{emptyText}</Text>
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
          renderItem={({ item }) => (
            <View style={styles.ticket} testID={`ticket-${item.id}`}>
              <View style={styles.ticketHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ticketId}>#{item.id.split('-').pop() || item.id.slice(0, 8)}</Text>
                  {item.table_number ? (
                    <Text style={styles.ticketTable}>Table {item.table_number}</Text>
                  ) : null}
                </View>
                <View style={styles.ticketHeadRight}>
                  {item.status !== 'completed' && item.status !== 'cancelled' && (
                    <Pressable
                      testID={`cancel-ticket-link-${item.id}`}
                      onPress={() => cancelTicket(item.id)}
                      hitSlop={8}
                      style={styles.cancelLink}
                    >
                      <Text style={styles.cancelLinkText}>Cancel</Text>
                    </Pressable>
                  )}
                  <View
                    style={[
                      styles.timePill,
                      { backgroundColor: urgencyColor(item.created_at) + '22' },
                    ]}
                  >
                    <Ionicons
                      name="time-outline"
                      size={10}
                      color={urgencyColor(item.created_at)}
                    />
                    <Text
                      style={[styles.timeText, { color: urgencyColor(item.created_at) }]}
                    >
                      {timeAgo(item.created_at)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.itemsBlock}>
                {item.items.map((li, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemQty}>{li.quantity}×</Text>
                    <Text style={styles.itemName}>{li.name}</Text>
                  </View>
                ))}
              </View>

              {item.notes ? (
                <View style={styles.notesBox}>
                  <Ionicons name="chatbubble-ellipses-outline" size={10} color={colors.brand} />
                  <Text style={styles.notesText}>{item.notes}</Text>
                </View>
              ) : null}

              {action && (
                <Pressable
                  testID={`ticket-action-${item.id}`}
                  onPress={() => updateStatus(item.id, action.nextStatus)}
                  style={[styles.actionBtn, { backgroundColor: action.color }]}
                >
                  <Ionicons name={action.icon} size={16} color={colors.onBrandPrimary} />
                  <Text style={styles.actionText}>{action.label}</Text>
                </Pressable>
              )}
            </View>
          )}
        />
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
  ticket: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.card,
  },
  ticketHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketHeadRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cancelLink: { paddingHorizontal: 2, paddingVertical: 2 },
  cancelLinkText: {
    color: colors.error,
    fontSize: type.sm,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  ticketId: { fontSize: type.lg, fontWeight: '800', color: colors.onSurface, letterSpacing: -0.3 },
  ticketTable: { fontSize: type.sm, color: colors.muted, marginTop: 2 },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  timeText: { fontSize: type.xs, fontWeight: '800' },
  itemsBlock: { gap: 2 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemQty: { width: 28, color: colors.brand, fontSize: type.lg, fontWeight: '800' },
  itemName: { flex: 1, color: colors.onSurface, fontSize: type.lg, fontWeight: '600' },
  notesBox: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'flex-start',
    padding: spacing.sm,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.sm,
  },
  notesText: { flex: 1, color: colors.onBrandTertiary, fontSize: type.sm, fontWeight: '600' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: 2,
  },
  actionText: { color: colors.onBrandPrimary, fontWeight: '800', fontSize: type.base, letterSpacing: 0.5 },
});

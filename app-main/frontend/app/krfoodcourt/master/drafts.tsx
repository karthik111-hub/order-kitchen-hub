import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { api, Order } from '@/src/api';
import { colors, radius, spacing, type, shadow } from '@/src/theme';
import { confirm } from '@/src/utils/confirm';

const timeAgo = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
};

export default function DraftsScreen() {
  const [drafts, setDrafts] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.listDrafts();
      setDrafts(data);
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

  const sendDraft = async (draft: Order) => {
    const ok = await confirm(
      'Send draft?',
      `Send this draft as an order to the kitchen?`,
      { confirmLabel: 'Send', cancelLabel: 'Cancel' },
    );
    if (!ok) return;
    
    try {
      const result = await api.sendDraft(draft.id);
      setDrafts(prev => prev.filter(d => d.id !== draft.id));
      Alert.alert('Success', `Order #${result.order_id.split('-').pop()} sent to kitchen`);
      load();
    } catch (e: any) {
      Alert.alert('Failed to send', e?.message ?? 'Try again');
      load();
    }
  };

  const deleteDraft = async (draft: Order) => {
    const ok = await confirm(
      'Delete draft?',
      `Delete this draft permanently?`,
      { confirmLabel: 'Delete', cancelLabel: 'Cancel', destructive: true },
    );
    if (!ok) return;

    setDrafts(prev => prev.filter(d => d.id !== draft.id));
    try {
      await api.deleteDraft(draft.id);
      load();
    } catch (e: any) {
      Alert.alert('Failed to delete', e?.message ?? 'Try again');
      load();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Drafts</Text>
        <Text style={styles.sub}>{drafts.length} saved</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : drafts.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="document-outline" size={26} color={colors.brand} />
          </View>
          <Text style={styles.emptyTitle}>No drafts</Text>
          <Text style={styles.emptySub}>Draft orders will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={drafts}
          keyExtractor={d => d.id}
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
            <View style={styles.card} testID={`draft-card-${item.id}`}>
              <View style={styles.rowBetween}>
                <View style={styles.flex1}>
                  <Text style={styles.draftId}>Draft</Text>
                  <Text style={styles.draftTime}>{timeAgo(item.created_at)}</Text>
                </View>
                <Text style={styles.total}>₹{item.total.toFixed(2)}</Text>
              </View>

              <View style={styles.draftPill}>
                <Ionicons name="document-text-outline" size={12} color={colors.muted} />
                <Text style={styles.draftPillText}>DRAFT</Text>
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

              <View style={styles.actions}>
                <Pressable
                  style={[styles.actionButton, styles.sendButton]}
                  onPress={() => sendDraft(item)}
                  testID={`send-draft-${item.id}`}
                >
                  <Ionicons name="send" size={16} color="white" />
                  <Text style={styles.actionButtonText}>Send</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => deleteDraft(item)}
                  testID={`delete-draft-${item.id}`}
                >
                  <Ionicons name="trash-outline" size={16} color="white" />
                </Pressable>
              </View>
            </View>
          )}
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
  flex1: { flex: 1 },
  draftId: { fontSize: type.base, fontWeight: '800', color: colors.muted },
  draftTime: { color: colors.muted, fontSize: type.sm, marginTop: 2 },
  total: { fontSize: type.lg, fontWeight: '800', color: colors.brand },
  draftPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    marginTop: spacing.xs,
    width: 'auto',
    alignSelf: 'flex-start',
  },
  draftPillText: { fontSize: type.xs, fontWeight: '800', color: colors.muted, letterSpacing: 0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  metaText: { color: colors.onSurfaceTertiary, fontSize: type.sm },
  itemRow: { flexDirection: 'row', paddingVertical: 2, alignItems: 'center' },
  itemQty: { width: 22, color: colors.brand, fontWeight: '800', fontSize: type.sm },
  itemName: { flex: 1, color: colors.onSurface, fontSize: type.base },
  itemPrice: { color: colors.onSurfaceTertiary, fontSize: type.base, fontWeight: '600' },
  notes: { marginTop: spacing.xs, color: colors.onSurfaceTertiary, fontStyle: 'italic', fontSize: type.sm },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.sm },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  sendButton: {
    backgroundColor: colors.success,
  },
  deleteButton: {
    backgroundColor: colors.error,
    flex: 0,
    paddingHorizontal: spacing.md,
  },
  actionButtonText: {
    color: 'white',
    fontSize: type.base,
    fontWeight: '700',
  },
});

import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { api, Category } from '@/src/api';
import { colors, radius, spacing, type, shadow } from '@/src/theme';

export default function AdminCategories() {
  const router = useRouter();
  const [cats, setCats] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.listCategories();
      setCats(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!name.trim()) {
      Alert.alert('Category name required', 'Please enter a category name');
      return;
    }
    try {
      setSaving(true);
      await api.createCategory(name.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setName('');
      load();
    } catch (e: any) {
      Alert.alert('Failed', e?.message ?? 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const remove = (c: Category) => {
    console.log('Delete clicked for category:', c.id, c.name);
    const confirmed = confirm(`Delete "${c.name}"?\n\nThis will also remove all items inside this category.`);
    if (confirmed) {
      handleDelete(c);
    }
  };

  const handleDelete = async (c: Category) => {
    console.log('Delete confirmed, sending request...');
    try {
      console.log('Calling api.deleteCategory with id:', c.id);
      await api.deleteCategory(c.id);
      console.log('Delete successful');
      load();
    } catch (e: any) {
      console.error('Delete error:', e);
      alert('Delete failed: ' + (e?.message || 'Unknown error'));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Categories</Text>
            <Text style={styles.sub}>Group items like Starters, Main Course, Soups</Text>
          </View>
          <Pressable
            testID="admin-switch-role-btn"
            onPress={() => router.replace('/' as any)}
            style={styles.switchBtn}
          >
            <Ionicons name="swap-horizontal" size={14} color={colors.brand} />
          </Pressable>
        </View>

        <View style={styles.formCard}>
          <TextInput
            testID="cat-name-input"
            placeholder="New category (e.g., Starters)"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={create}
          />
          <Pressable
            testID="cat-add-btn"
            onPress={create}
            disabled={saving}
            style={[styles.addBtn, saving && { opacity: 0.6 }]}
          >
            {saving ? (
              <ActivityIndicator color={colors.onBrandPrimary} />
            ) : (
              <>
                <Ionicons name="add" size={14} color={colors.onBrandPrimary} />
                <Text style={styles.addBtnText}>Add</Text>
              </>
            )}
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.brand} style={{ marginTop: spacing.xl }} />
        ) : cats.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="albums-outline" size={26} color={colors.brand} />
            </View>
            <Text style={styles.emptyTitle}>No categories yet</Text>
            <Text style={styles.emptySub}>Add one above to get started.</Text>
          </View>
        ) : (
          <FlatList
            data={cats}
            keyExtractor={c => c.id}
            contentContainerStyle={{
              paddingHorizontal: spacing.lg,
              paddingBottom: 80,
              gap: spacing.sm,
            }}
            renderItem={({ item }) => (
              <View style={styles.row} testID={`cat-row-${item.id}`}>
                <View style={styles.rowIcon}>
                  <Ionicons name="pricetag-outline" size={14} color={colors.brand} />
                </View>
                <Text style={styles.rowName}>{item.name}</Text>
                <Pressable
                  testID={`cat-delete-${item.id}`}
                  onPress={() => remove(item)}
                  style={styles.deleteBtn}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={14} color={colors.error} />
                </Pressable>
              </View>
            )}
          />
        )}
      </KeyboardAvoidingView>
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
  formCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    color: colors.onSurface,
    fontSize: type.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  addBtnText: { color: colors.onBrandPrimary, fontWeight: '800', fontSize: type.base },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    ...shadow.soft,
  },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: { flex: 1, fontSize: type.base, fontWeight: '700', color: colors.onSurface },
  deleteBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: '#FFE5E3',
  },
});

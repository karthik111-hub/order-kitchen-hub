import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { api } from '@/src/api';
import { colors, radius, spacing, type, shadow } from '@/src/theme';

const formatDate = (d: Date) => d.toISOString().split('T')[0];
const todayDate = formatDate(new Date());

export default function AdminSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [masked, setMasked] = useState<string | null>(null);
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [fromDate, setFromDate] = useState(todayDate);
  const [toDate, setToDate] = useState(todayDate);

  const load = useCallback(async () => {
    try {
      const s = await api.rzpStatus();
      setConfigured(s.configured);
      setMasked(s.key_id_masked);
    } catch {
      /* ignore */
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

  const save = async () => {
    if (!keyId.trim() || !keySecret.trim()) {
      Alert.alert('Missing keys', 'Enter both Key ID and Key Secret.');
      return;
    }
    try {
      setSaving(true);
      const r = await api.rzpSaveSettings(keyId.trim(), keySecret.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setConfigured(true);
      setMasked(r.key_id_masked);
      setKeyId('');
      setKeySecret('');
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const clear = () => {
    Alert.alert('Remove Razorpay keys?', 'Payments will be disabled until new keys are set.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.rzpClearSettings();
            setConfigured(false);
            setMasked(null);
          } catch (e: any) {
            Alert.alert('Failed', e?.message);
          }
        },
      },
    ]);
  };

  const openDocs = () =>
    Linking.openURL('https://dashboard.razorpay.com/app/keys').catch(() => {});

  const handleLogout = async () => {
    Alert.alert('Sign out?', 'You will be logged out and return to the login screen.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await SecureStore.deleteItemAsync('userRole');
            router.replace('/');
          } catch (e) {
            console.error('Logout error:', e);
            router.replace('/');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.sub}>Configure payments and downloads</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHead}>
              <View style={styles.iconPill}>
                <Ionicons name="card-outline" size={16} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Razorpay payments</Text>
                <Text style={styles.cardSub}>Enable UPI + Card payments at checkout</Text>
              </View>
              {loading ? (
                <ActivityIndicator color={colors.brand} />
              ) : (
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: configured ? '#E5F8EA' : colors.surfaceTertiary,
                    },
                  ]}
                  testID="rzp-status-pill"
                >
                  <Ionicons
                    name={configured ? 'checkmark-circle' : 'ellipse-outline'}
                    size={12}
                    color={configured ? colors.success : colors.muted}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: configured ? colors.success : colors.muted },
                    ]}
                  >
                    {configured ? 'Configured' : 'Not configured'}
                  </Text>
                </View>
              )}
            </View>

            {configured && masked ? (
              <View style={styles.maskedRow}>
                <Ionicons name="key-outline" size={12} color={colors.onSurfaceTertiary} />
                <Text style={styles.maskedText}>Current Key ID: {masked}</Text>
              </View>
            ) : null}

            <TextInput
              testID="rzp-key-id-input"
              placeholder="Key ID (rzp_test_... or rzp_live_...)"
              placeholderTextColor={colors.muted}
              value={keyId}
              onChangeText={setKeyId}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <TextInput
              testID="rzp-key-secret-input"
              placeholder="Key Secret"
              placeholderTextColor={colors.muted}
              value={keySecret}
              onChangeText={setKeySecret}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={styles.input}
            />

            <Pressable
              testID="rzp-save-btn"
              onPress={save}
              disabled={saving}
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            >
              {saving ? (
                <ActivityIndicator color={colors.onBrandPrimary} />
              ) : (
                <>
                  <Ionicons name="save-outline" size={14} color={colors.onBrandPrimary} />
                  <Text style={styles.saveBtnText}>
                    {configured ? 'Update Keys' : 'Save Keys'}
                  </Text>
                </>
              )}
            </Pressable>

            {configured && (
              <Pressable testID="rzp-clear-btn" onPress={clear} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>Remove keys</Text>
              </Pressable>
            )}

            <Pressable onPress={openDocs} style={styles.linkBtn}>
              <Ionicons name="open-outline" size={12} color={colors.brand} />
              <Text style={styles.linkText}>Get keys from Razorpay dashboard</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHead}>
              <View style={styles.iconPill}>
                <Ionicons name="download-outline" size={16} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Daily report</Text>
                <Text style={styles.cardSub}>Export orders as an Excel file</Text>
              </View>
            </View>
            <Pressable
              testID="download-report-btn"
              onPress={() => setReportModalOpen(true)}
              style={styles.saveBtn}
            >
              <Ionicons name="cloud-download-outline" size={14} color={colors.onBrandPrimary} />
              <Text style={styles.saveBtnText}>Download report (.xlsx)</Text>
            </Pressable>
            <Text style={styles.helperText}>
              Select date range to download orders report
            </Text>
          </View>

          <Modal
            visible={reportModalOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setReportModalOpen(false)}
          >
            <Pressable
              style={styles.backdrop}
              onPress={() => setReportModalOpen(false)}
            />
            <View style={styles.reportModal}>
              <Text style={styles.reportTitle}>Select Date Range</Text>
              <View style={styles.dateInputGroup}>
                <View style={styles.dateField}>
                  <Text style={styles.dateLabel}>From Date</Text>
                  <TextInput
                    testID="report-from-date-input"
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.muted}
                    value={fromDate}
                    onChangeText={setFromDate}
                    style={styles.dateInput}
                  />
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.dateLabel}>To Date</Text>
                  <TextInput
                    testID="report-to-date-input"
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.muted}
                    value={toDate}
                    onChangeText={setToDate}
                    style={styles.dateInput}
                  />
                </View>
              </View>
              <Pressable
                testID="download-range-report-btn"
                onPress={() => {
                  Linking.openURL(api.dailyReportUrl(fromDate, toDate));
                  setReportModalOpen(false);
                }}
                style={styles.downloadBtn}
              >
                <Ionicons name="cloud-download-outline" size={14} color={colors.onBrandPrimary} />
                <Text style={styles.downloadBtnText}>Download Report</Text>
              </Pressable>
              <Pressable
                testID="cancel-report-btn"
                onPress={() => setReportModalOpen(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </Modal>

          <View style={styles.card}>
            <Pressable
              testID="logout-btn"
              onPress={handleLogout}
              style={styles.logoutBtn}
            >
              <Ionicons name="log-out-outline" size={16} color={colors.error} />
              <Text style={styles.logoutBtnText}>Sign out</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: { fontSize: type.xxl, fontWeight: '800', color: colors.onSurface, letterSpacing: -0.5 },
  sub: { color: colors.muted, marginTop: 2, fontSize: type.sm },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    gap: spacing.sm,
    ...shadow.soft,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  iconPill: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: type.lg, fontWeight: '800', color: colors.onSurface },
  cardSub: { fontSize: type.sm, color: colors.muted, marginTop: 1 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusText: { fontSize: type.sm, fontWeight: '800' },
  maskedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: spacing.sm,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.sm,
  },
  maskedText: { fontSize: type.sm, color: colors.onSurfaceTertiary, fontWeight: '600' },
  input: {
    backgroundColor: colors.surfaceTertiary,
    padding: spacing.md,
    borderRadius: radius.md,
    color: colors.onSurface,
    fontSize: type.base,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.brand,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    marginTop: spacing.xs,
  },
  saveBtnText: { color: colors.onBrandPrimary, fontWeight: '800', fontSize: type.base },
  clearBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: 2,
  },
  clearBtnText: { color: colors.error, fontWeight: '700', fontSize: type.sm },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
  },
  linkText: { color: colors.brand, fontWeight: '600', fontSize: type.sm },
  helperText: { color: colors.muted, fontSize: type.sm, marginTop: 4, textAlign: 'center' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  reportTitle: {
    fontSize: type.lg,
    fontWeight: '800',
    color: colors.onSurface,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  dateInputGroup: {
    width: '100%',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  dateField: {
    gap: spacing.xs,
  },
  dateLabel: {
    fontSize: type.sm,
    color: colors.onSurfaceTertiary,
    fontWeight: '700',
  },
  dateInput: {
    backgroundColor: colors.surfaceTertiary,
    padding: spacing.md,
    borderRadius: radius.md,
    color: colors.onSurface,
    fontSize: type.base,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.brand,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
    width: '100%',
  },
  downloadBtnText: {
    color: colors.onBrandPrimary,
    fontWeight: '800',
    fontSize: type.base,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  cancelBtnText: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: type.base,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1.5,
    borderColor: colors.error,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  logoutBtnText: {
    color: colors.error,
    fontWeight: '800',
    fontSize: type.base,
  },
});

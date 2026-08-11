import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ImageBackground,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api, Role } from '@/src/api';
import { colors, spacing, radius, type, shadow } from '@/src/theme';

type RoleOption = {
  role: Role;
  title: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  image: string;
};

const OPTIONS: RoleOption[] = [
  {
    role: 'admin',
    title: 'Admin',
    sub: 'Manage menu · categories · items',
    icon: 'shield-checkmark-outline',
    image:
      'https://images.unsplash.com/photo-1497644083578-611b798c60f3?auto=format&fit=crop&w=1200&q=80',
  },
  {
    role: 'master',
    title: 'Master',
    sub: 'Take orders from the floor',
    icon: 'clipboard-outline',
    image:
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80',
  },
  {
    role: 'chef',
    title: 'Chef',
    sub: 'Cook tickets · push service forward',
    icon: 'flame-outline',
    image:
      'https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=1200&q=80',
  },
];

export default function RoleSelect() {
  const router = useRouter();
  const [selected, setSelected] = useState<RoleOption | null>(null);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPrompt = (opt: RoleOption) => {
    Haptics.selectionAsync();
    setSelected(opt);
    setPassword('');
    setError(null);
  };

  const closePrompt = () => {
    if (submitting) return;
    setSelected(null);
    setPassword('');
    setError(null);
  };

  const submit = async () => {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.verifyRole(selected.role, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const role = selected.role;
      setSelected(null);
      setPassword('');
      router.replace(`/${role}` as any);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Incorrect password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.brandBadge}>
          <Ionicons name="restaurant" size={12} color={colors.brand} />
          <Text style={styles.brandBadgeText}>Nanu marchipoyava mama...</Text>
        </View>
        <Text style={styles.title}>Who's on duty?</Text>
        <Text style={styles.subtitle}>Pick your role to jump straight into the flow.</Text>
      </View>

      <View style={styles.cards}>
        {OPTIONS.map(opt => (
          <Pressable
            key={opt.role}
            testID={`role-${opt.role}-card`}
            onPress={() => openPrompt(opt)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <ImageBackground
              source={{ uri: opt.image }}
              style={styles.cardImage}
              imageStyle={styles.cardImageInner}
            >
              <View style={styles.overlay} />
              <View style={styles.cardContent}>
                <View style={styles.iconPill}>
                  <Ionicons name={opt.icon} size={14} color={colors.onBrandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{opt.title}</Text>
                  <Text style={styles.cardSub}>{opt.sub}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={colors.onBrandPrimary} />
              </View>
            </ImageBackground>
          </Pressable>
        ))}
      </View>

      <Modal transparent visible={!!selected} animationType="slide" onRequestClose={closePrompt}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalRoot}
        >
          <Pressable style={styles.backdrop} onPress={closePrompt} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>
              {selected?.title} sign in
            </Text>
            <Text style={styles.sheetSub}>
              Enter the {selected?.title.toLowerCase()} password to continue.
            </Text>
            <TextInput
              testID="role-password-input"
              placeholder="Password"
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoFocus
              onSubmitEditing={submit}
              returnKeyType="go"
              style={styles.input}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable
              testID="role-password-submit"
              onPress={submit}
              disabled={submitting || password.length === 0}
              style={[
                styles.submitBtn,
                (submitting || password.length === 0) && { opacity: 0.6 },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={colors.onBrandPrimary} />
              ) : (
                <Text style={styles.submitBtnText}>Continue</Text>
              )}
            </Pressable>
            <Pressable onPress={closePrompt} style={styles.cancelBtn} disabled={submitting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: spacing.xl },
  header: { marginTop: spacing.lg, marginBottom: spacing.lg },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  brandBadgeText: {
    color: colors.brand,
    fontWeight: '700',
    fontSize: type.sm,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: type.huge,
    fontWeight: '800',
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  subtitle: { marginTop: 4, fontSize: type.base, color: colors.onSurfaceTertiary },
  cards: { flex: 1, justifyContent: 'center', gap: spacing.md },
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.card,
    height: 120,
  },
  cardImage: { flex: 1, justifyContent: 'flex-end' },
  cardImageInner: { borderRadius: radius.lg },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,20,20,0.5)',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  iconPill: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { color: colors.onBrandPrimary, fontSize: type.xl, fontWeight: '800' },
  cardSub: { color: colors.onBrandPrimary, opacity: 0.9, fontSize: type.sm, marginTop: 2 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 30,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.md,
  },
  sheetTitle: { fontSize: type.xl, fontWeight: '800', color: colors.onSurface },
  sheetSub: {
    fontSize: type.base,
    color: colors.onSurfaceTertiary,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surfaceTertiary,
    padding: spacing.md,
    borderRadius: radius.md,
    color: colors.onSurface,
    fontSize: type.base,
  },
  errorText: { color: colors.error, marginTop: spacing.sm, fontSize: type.sm, fontWeight: '600' },
  submitBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.brand,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  submitBtnText: { color: colors.onBrandPrimary, fontWeight: '800', fontSize: type.lg },
  cancelBtn: { alignItems: 'center', marginTop: spacing.sm, paddingVertical: spacing.sm },
  cancelBtnText: { color: colors.muted, fontWeight: '600', fontSize: type.base },
});

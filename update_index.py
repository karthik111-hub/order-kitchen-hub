#!/usr/bin/env python3
import re

with open('app-main/frontend/app/master/index.tsx', 'r') as f:
    content = f.read()

# Add savingDraft state
content = content.replace(
    '  const [placing, setPlacing] = useState(false);',
    '  const [placing, setPlacing] = useState(false);\n  const [savingDraft, setSavingDraft] = useState(false);'
)

# Add saveDraft function before the renderRow function
save_draft_fn = '''
  const saveDraft = async () => {
    if (lines.length === 0) return;
    try {
      setSavingDraft(true);
      await api.saveDraft({
        items: lines,
        table_number: tableNumber || undefined,
        notes: notes || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      cartStore.clear();
      setTableNumber('');
      setNotes('');
      setCartOpen(false);
      Alert.alert('Success', 'Order saved as draft');
    } catch (e: any) {
      Alert.alert('Failed to save draft', e?.message ?? 'Try again');
    } finally {
      setSavingDraft(false);
    }
  };
'''

content = content.replace(
    '  const renderRow = (',
    save_draft_fn + '\n  const renderRow = ('
)

# Add save draft button before closing Modal
save_draft_button = '''            <Pressable
              testID="save-draft-btn"
              onPress={saveDraft}
              disabled={savingDraft || placing || paying}
              style={[
                styles.draftBtn,
                (savingDraft || placing || paying) && { opacity: 0.55 },
              ]}
            >
              {savingDraft ? (
                <ActivityIndicator color={colors.muted} />
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={14} color={colors.muted} />
                  <Text style={styles.draftBtnText}>Save as Draft</Text>
                </>
              )}
            </Pressable>
'''

content = content.replace(
    '            {!payConfigured && (\n              <Text style={styles.payHint}>Ask the admin to add Razorpay keys in Settings.</Text>\n            )}',
    '            {!payConfigured && (\n              <Text style={styles.payHint}>Ask the admin to add Razorpay keys in Settings.</Text>\n            )}\n' + save_draft_button
)

# Add styles
draft_styles = '''  draftBtn: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: colors.muted,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  draftBtnText: { color: colors.muted, fontWeight: '700', fontSize: type.base },
'''

content = content.replace(
    '  payHint: {\n    marginTop: 4,\n    textAlign: \'center\',\n    color: colors.muted,\n    fontSize: type.sm,\n  },\n});',
    '  payHint: {\n    marginTop: 4,\n    textAlign: \'center\',\n    color: colors.muted,\n    fontSize: type.sm,\n  },\n' + draft_styles + '});'
)

with open('app-main/frontend/app/master/index.tsx', 'w') as f:
    f.write(content)

print("Updated index.tsx with draft functionality!")

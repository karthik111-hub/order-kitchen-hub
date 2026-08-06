import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirmation.
 * On web, uses window.confirm() because react-native-web's Alert.alert()
 * only shows the title/message and ignores buttons.
 * On native, uses Alert.alert with a Cancel/Confirm pair.
 */
export function confirm(
  title: string,
  message: string,
  {
    confirmLabel = 'OK',
    cancelLabel = 'Cancel',
    destructive = false,
  }: { confirmLabel?: string; cancelLabel?: string; destructive?: boolean } = {},
): Promise<boolean> {
  if (Platform.OS === 'web') {
    const ok =
      typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm(`${title}\n\n${message}`)
        : true;
    return Promise.resolve(ok);
  }
  return new Promise(resolve => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

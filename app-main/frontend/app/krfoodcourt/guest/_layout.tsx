import { Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/src/theme';

export default function GuestLayout() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const guestId = await SecureStore.getItemAsync('guestId');
        if (!guestId) {
          router.replace('/krfoodcourt' as any);
          return;
        }
        setAuthChecked(true);
      } catch (e) {
        router.replace('/krfoodcourt' as any);
      }
    };

    checkAuth();
  }, []);

  if (!authChecked) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

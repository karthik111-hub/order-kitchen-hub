import { useEffect, useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, type } from '@/src/theme';

export default function AdminLayout() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const storedRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
        
        if (storedRole !== 'admin') {
          console.log(`Auth failed for admin: storedRole=${storedRole}`);
          router.replace('/');
          return;
        }
        
        console.log('Admin auth valid');
      } catch (e) {
        console.error('Admin auth check error:', e);
        router.replace('/');
      } finally {
        setAuthChecked(true);
      }
    };

    setTimeout(() => {
      checkAuth();
    }, 0);
  }, [router]);

  if (!authChecked) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surfaceSecondary,
          borderTopColor: colors.border,
          height: 62,
          paddingTop: 4,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: type.sm,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Categories',
          tabBarIcon: ({ color }) => <Ionicons name="albums-outline" size={18} color={color} />,
          tabBarButtonTestID: 'admin-tab-categories',
        }}
      />
      <Tabs.Screen
        name="items"
        options={{
          title: 'Items',
          tabBarIcon: ({ color }) => <Ionicons name="fast-food-outline" size={18} color={color} />,
          tabBarButtonTestID: 'admin-tab-items',
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color }) => <Ionicons name="receipt-outline" size={18} color={color} />,
          tabBarButtonTestID: 'admin-tab-orders',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={18} color={color} />,
          tabBarButtonTestID: 'admin-tab-settings',
        }}
      />
    </Tabs>
  );
}

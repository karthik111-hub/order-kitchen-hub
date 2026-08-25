import { useEffect, useState } from 'react';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, type } from '@/src/theme';

export default function ChefLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const storedRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
        
        if (storedRole !== 'chef') {
          console.log(`Auth failed for chef: storedRole=${storedRole}`);
          router.replace('/');
          return;
        }
        
        console.log('Chef auth valid');
      } catch (e) {
        console.error('Chef auth check error:', e);
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
        name="pending"
        options={{
          title: 'Pending',
          tabBarIcon: ({ color }) => <Ionicons name="hourglass-outline" size={18} color={color} />,
          tabBarButtonTestID: 'chef-tab-pending',
        }}
      />
      <Tabs.Screen
        name="preparing"
        options={{
          title: 'Preparing',
          tabBarIcon: ({ color }) => <Ionicons name="flame-outline" size={18} color={color} />,
          tabBarButtonTestID: 'chef-tab-preparing',
        }}
      />
      <Tabs.Screen
        name="completed"
        options={{
          title: 'Completed',
          tabBarIcon: ({ color }) => <Ionicons name="checkmark-done-outline" size={18} color={color} />,
          tabBarButtonTestID: 'chef-tab-completed',
        }}
      />
      <Tabs.Screen
        name="completed-details"
        options={{
          // Reachable via router.push from the Completed summary screen,
          // but not shown as its own tab button.
          href: null,
        }}
      />
    </Tabs>
  );
}

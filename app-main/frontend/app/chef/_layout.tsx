import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, type } from '@/src/theme';

export default function ChefLayout() {
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
    </Tabs>
  );
}

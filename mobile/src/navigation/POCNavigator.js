import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Building, ShieldCheck } from 'lucide-react-native';
import { POCGuard } from './guards/RoleGuards';

import POCDashboardScreen from '../screens/POC/POCDashboardScreen';
import ResultVerificationScreen from '../screens/POC/ResultVerificationScreen';

const Tab = createBottomTabNavigator();

export default function POCNavigator() {
  return (
    <POCGuard>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: 'rgba(0, 0, 0, 0.08)',
            borderTopWidth: 1,
            height: 64,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: '#06b6d4',
          tabBarInactiveTintColor: '#64748b',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
          tabBarIcon: ({ color }) => {
            if (route.name === 'Overview') return <Building color={color} size={20} />;
            if (route.name === 'Verify') return <ShieldCheck color={color} size={20} />;
            return null;
          },
        })}
      >
        <Tab.Screen name="Overview" component={POCDashboardScreen} options={{ title: 'POC Overview' }} />
        <Tab.Screen name="Verify" component={ResultVerificationScreen} options={{ title: 'Verify Results' }} />
      </Tab.Navigator>
    </POCGuard>
  );
}

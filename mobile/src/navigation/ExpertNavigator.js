import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CheckCircle2, FileText } from 'lucide-react-native';
import { ExpertGuard } from './guards/RoleGuards';

import ExpertDashboardScreen from '../screens/Expert/ExpertDashboardScreen';
import CurriculumManagerScreen from '../screens/Expert/CurriculumManagerScreen';

const Tab = createBottomTabNavigator();

export default function ExpertNavigator() {
  return (
    <ExpertGuard>
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
          tabBarActiveTintColor: '#8b5cf6',
          tabBarInactiveTintColor: '#64748b',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
          tabBarIcon: ({ color }) => {
            if (route.name === 'Validation') return <CheckCircle2 color={color} size={20} />;
            if (route.name === 'Materials') return <FileText color={color} size={20} />;
            return null;
          },
        })}
      >
        <Tab.Screen name="Validation" component={ExpertDashboardScreen} options={{ title: 'Course Reviews' }} />
        <Tab.Screen name="Materials" component={CurriculumManagerScreen} options={{ title: 'Study Materials' }} />
      </Tab.Navigator>
    </ExpertGuard>
  );
}

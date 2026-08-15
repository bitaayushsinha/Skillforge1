import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ClipboardCheck, AlertCircle } from 'lucide-react-native';
import { ReviewerGuard } from './guards/RoleGuards';

import ReviewerDashboardScreen from '../screens/Reviewer/ReviewerDashboardScreen';
import ProposalEvaluationScreen from '../screens/Reviewer/ProposalEvaluationScreen';

const Tab = createBottomTabNavigator();

export default function ReviewerNavigator() {
  return (
    <ReviewerGuard>
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
          tabBarActiveTintColor: '#ec4899',
          tabBarInactiveTintColor: '#64748b',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
          tabBarIcon: ({ color }) => {
            if (route.name === 'Proposals') return <ClipboardCheck color={color} size={20} />;
            if (route.name === 'Issues') return <AlertCircle color={color} size={20} />;
            return null;
          },
        })}
      >
        <Tab.Screen name="Proposals" component={ReviewerDashboardScreen} options={{ title: 'Proposals' }} />
        <Tab.Screen name="Issues" component={ProposalEvaluationScreen} options={{ title: 'Cert Issues' }} />
      </Tab.Navigator>
    </ReviewerGuard>
  );
}

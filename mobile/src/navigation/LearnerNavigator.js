import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LayoutDashboard, BookOpen, Calendar, Award, LifeBuoy } from 'lucide-react-native';

import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import SubjectsScreen from '../screens/Dashboard/SubjectsScreen';
import SlotBookingScreen from '../screens/Dashboard/SlotBookingScreen';
import LiveClassesScreen from '../screens/Dashboard/LiveClassesScreen';
import MockResultsScreen from '../screens/Dashboard/MockResultsScreen';
import CertificationsScreen from '../screens/Dashboard/CertificationsScreen';
import PaymentCheckoutScreen from '../screens/Dashboard/PaymentCheckoutScreen';
import SupportScreen from '../screens/Dashboard/SupportScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardMain" component={DashboardScreen} />
      <Stack.Screen name="Subjects" component={SubjectsScreen} />
      <Stack.Screen name="Exams" component={ExamAndLiveStack} />
      <Stack.Screen name="Payments" component={PaymentCheckoutScreen} />
    </Stack.Navigator>
  );
}

function ExamAndLiveStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SlotBookingMain" component={SlotBookingScreen} />
      <Stack.Screen name="LiveClasses" component={LiveClassesScreen} />
      <Stack.Screen name="MockResults" component={MockResultsScreen} />
    </Stack.Navigator>
  );
}

function WalletStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CertificatesMain" component={CertificationsScreen} />
      <Stack.Screen name="Payments" component={PaymentCheckoutScreen} />
    </Stack.Navigator>
  );
}

export default function LearnerNavigator() {
  return (
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
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ color }) => {
          if (route.name === 'DashboardTab') return <LayoutDashboard color={color} size={20} />;
          if (route.name === 'SubjectsTab') return <BookOpen color={color} size={20} />;
          if (route.name === 'ExamsTab') return <Calendar color={color} size={20} />;
          if (route.name === 'WalletTab') return <Award color={color} size={20} />;
          if (route.name === 'SupportTab') return <LifeBuoy color={color} size={20} />;
          return null;
        },
      })}
    >
      <Tab.Screen name="DashboardTab" component={DashboardStack} options={{ title: 'Home' }} />
      <Tab.Screen name="SubjectsTab" component={SubjectsScreen} options={{ title: 'Subjects' }} />
      <Tab.Screen name="ExamsTab" component={ExamAndLiveStack} options={{ title: 'Bookings & Live' }} />
      <Tab.Screen name="WalletTab" component={WalletStack} options={{ title: 'Wallet' }} />
      <Tab.Screen name="SupportTab" component={SupportScreen} options={{ title: 'Support' }} />
    </Tab.Navigator>
  );
}

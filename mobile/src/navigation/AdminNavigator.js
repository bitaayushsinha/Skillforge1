import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, Building2, Users, ShieldAlert, Sliders, ShieldCheck } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';

import AdminDashboardScreen from '../screens/Admin/AdminDashboardScreen';
import InstitutionsScreen from '../screens/Admin/InstitutionsScreen';
import StudentsScreen from '../screens/Admin/StudentsScreen';
import SubAdminsScreen from '../screens/Admin/SubAdminsScreen';
import OperationsScreen from '../screens/Admin/OperationsScreen';
import ResultVerificationScreen from '../screens/POC/ResultVerificationScreen';

const Tab = createBottomTabNavigator();

export default function AdminNavigator() {
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const privs = user?.privileges || {};

  // Check visibility conditions for Sub-Admin
  const canSeeInstitutions = isAdmin || privs.manage_institutions;
  const canSeeStudents = isAdmin || privs.manage_students || privs.allocate_specializations || privs.reset_passwords;
  const canSeeSubAdmins = isAdmin; // Only top-level Admin can manage Sub-Admins
  const canSeeOperations = isAdmin || privs.view_reports || privs.custom_reports || privs.enrollment_reports || privs.manage_content || privs.bulk_upload;
  const canSeeVerification = privs.verify_assessments;

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
        tabBarActiveTintColor: '#f59e0b',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ color }) => {
          if (route.name === 'Overview') return <LayoutDashboard color={color} size={20} />;
          if (route.name === 'Institutions') return <Building2 color={color} size={20} />;
          if (route.name === 'Students') return <Users color={color} size={20} />;
          if (route.name === 'SubAdmins') return <ShieldAlert color={color} size={20} />;
          if (route.name === 'Operations') return <Sliders color={color} size={20} />;
          if (route.name === 'POCVerify') return <ShieldCheck color={color} size={20} />;
          return null;
        },
      })}
    >
      <Tab.Screen name="Overview" component={AdminDashboardScreen} options={{ title: 'Overview' }} />

      {canSeeInstitutions ? (
        <Tab.Screen name="Institutions" component={InstitutionsScreen} options={{ title: 'Colleges' }} />
      ) : null}

      {canSeeStudents ? (
        <Tab.Screen name="Students" component={StudentsScreen} options={{ title: 'Students' }} />
      ) : null}

      {canSeeSubAdmins ? (
        <Tab.Screen name="SubAdmins" component={SubAdminsScreen} options={{ title: 'Sub-Admins' }} />
      ) : null}

      {canSeeOperations ? (
        <Tab.Screen name="Operations" component={OperationsScreen} options={{ title: 'Operations' }} />
      ) : null}

      {canSeeVerification ? (
        <Tab.Screen name="POCVerify" component={ResultVerificationScreen} options={{ title: 'POC Verify' }} />
      ) : null}
    </Tab.Navigator>
  );
}

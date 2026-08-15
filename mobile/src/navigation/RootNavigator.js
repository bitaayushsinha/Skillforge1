import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/Auth/LoginScreen';
import LearnerNavigator from './LearnerNavigator';
import AdminNavigator from './AdminNavigator';
import ExpertNavigator from './ExpertNavigator';
import ReviewerNavigator from './ReviewerNavigator';
import POCNavigator from './POCNavigator';

export default function RootNavigator() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Initializing SkillForge...</Text>
      </View>
    );
  }

  const renderRoleNavigator = () => {
    if (!isAuthenticated || !user) {
      return <LoginScreen />;
    }

    switch (user.role) {
      case 'admin':
        return <AdminNavigator />;
      case 'sub_admin':
        // If sub-admin is strictly dedicated to assessment verification/POC role
        if (
          user?.privileges?.verify_assessments &&
          !user?.privileges?.manage_institutions &&
          !user?.privileges?.manage_students &&
          !user?.privileges?.view_reports
        ) {
          return <POCNavigator />;
        }
        return <AdminNavigator />;
      case 'expert':
        return <ExpertNavigator />;
      case 'reviewer':
        return <ReviewerNavigator />;
      case 'poc':
        return <POCNavigator />;
      case 'learner':
      default:
        return <LearnerNavigator />;
    }
  };

  return (
    <NavigationContainer>
      {renderRoleNavigator()}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FAF7F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#475569',
    marginTop: 12,
    fontSize: 15,
  },
});

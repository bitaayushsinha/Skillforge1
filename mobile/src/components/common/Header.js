import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LogOut } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';

export default function Header({ title, subtitle, rightAction }) {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.rightSection}>
        {rightAction ? (
          rightAction
        ) : (
          <View style={styles.userControls}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{user?.role?.toUpperCase() || 'USER'}</Text>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <LogOut size={18} color="#0f172a" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  leftSection: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    backgroundColor: 'rgba(79, 70, 229, 0.25)',
    borderWidth: 1,
    borderColor: '#4f46e5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#818cf8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#ef4444',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

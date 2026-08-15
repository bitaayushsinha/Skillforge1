import React, { createContext, useState, useEffect, useContext } from 'react';
import api, { setUnauthorizedCallback } from '../services/api';
import authStorage from '../services/authStorage';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Register unauthorized callback so 401 responses log user out in state
    setUnauthorizedCallback(() => {
      setUser(null);
      setToken(null);
    });

    // Check secure storage on startup
    const loadSession = async () => {
      try {
        const storedToken = await authStorage.getToken();
        const storedUser = await authStorage.getUser();

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);
          
          // Verify token and refresh user profile with backend cleanly
          try {
            const response = await api.get('/api/users/me', {
              headers: { Authorization: `Bearer ${storedToken}` }
            });
            setUser(response.data);
            await authStorage.setUser(response.data);
          } catch (err) {
            if (err.response?.status === 401) {
              await authStorage.clearAll();
              setToken(null);
              setUser(null);
            }
          }
        }
      } catch (error) {
        console.error('Error loading session from storage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { access_token, user: userData } = response.data;

      if (access_token && userData) {
        await authStorage.setToken(access_token);
        await authStorage.setUser(userData);
        setToken(access_token);
        setUser(userData);
        return { success: true, user: userData };
      }
      return { success: false, error: 'Invalid response format from server.' };
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Login failed. Please check your network and credentials.';
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    try {
      await authStorage.clearAll();
    } catch (error) {
      console.error('Error during secure storage clear on logout:', error);
    } finally {
      setUser(null);
      setToken(null);
    }
  };

  const refreshProfile = async () => {
    if (!token) return null;
    try {
      const response = await api.get('/api/users/me');
      setUser(response.data);
      await authStorage.setUser(response.data);
      return response.data;
    } catch (error) {
      console.error('Error refreshing profile:', error);
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        refreshProfile,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;

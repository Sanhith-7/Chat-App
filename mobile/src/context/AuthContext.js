import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [authStateLoaded, setAuthStateLoaded] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState([]);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('auth');
      if (saved) {
        const { token: t, user: u } = JSON.parse(saved);
        setToken(t);
        setUser(u);
        api.setToken(t);
        const s = connectSocket(t);
        s.on('presence:update', ({ onlineUserIds }) => {
          console.log('Presence update received:', onlineUserIds);
          setOnlineUserIds(onlineUserIds);
        });
        s.emit('presence:get');
      }
      setAuthStateLoaded(true);
    })();
  }, []);

  useEffect(() => {
    // Keep socket connection in sync with auth token
    if (token) {
      const s = connectSocket(token);
      s.on('presence:update', ({ onlineUserIds }) => {
        console.log('Presence update received:', onlineUserIds);
        setOnlineUserIds(onlineUserIds);
      });
      s.emit('presence:get');
    } else {
      disconnectSocket();
      setOnlineUserIds([]);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const data = res.data;
    setToken(data.token);
    setUser(data.user);
    api.setToken(data.token);
    await AsyncStorage.setItem('auth', JSON.stringify({ token: data.token, user: data.user }));
  };

  const register = async (username, email, password) => {
    const res = await api.post('/auth/register', { username, email, password });
    const data = res.data;
    setToken(data.token);
    setUser(data.user);
    api.setToken(data.token);
    await AsyncStorage.setItem('auth', JSON.stringify({ token: data.token, user: data.user }));
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    api.setToken(null);
    await AsyncStorage.removeItem('auth');
    disconnectSocket();
    setOnlineUserIds([]);
  };

  const value = useMemo(() => ({ 
    token, 
    user, 
    login, 
    register, 
    logout, 
    authStateLoaded, 
    onlineUserIds 
  }), [token, user, authStateLoaded, onlineUserIds]);
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}



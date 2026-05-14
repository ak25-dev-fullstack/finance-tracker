import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_KEY } from '@/services/storage';

export interface User {
  name: string;
  email: string;
  phone?: string;
  accountNumber?: string;
  sortCode?: string;
  memberSince?: string;
  nationality?: string;
}

const MOCK_USER = {
  username: 'customer',
  password: 'customer123',
  user: {
    name: 'Alex Morgan',
    email: 'alex.morgan@dwk.co.uk',
    phone: '+44 7700 900456',
    accountNumber: '12345678',
    sortCode: '04-00-04',
    memberSince: '2024-01-15T10:30:00.000Z',
    nationality: 'British',
  } as User,
};

export type LoginResult = 'ok' | 'unknown_user' | 'wrong_password';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_KEY = 'auth_session_v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY).then(raw => {
      if (raw) {
        try {
          const { savedUser } = JSON.parse(raw);
          setUser(savedUser);
        } catch {
          AsyncStorage.removeItem(SESSION_KEY);
        }
      }
      setLoading(false);
    });
  }, []);

  const logout = () => {
    setUser(null);
    AsyncStorage.removeItem(SESSION_KEY);
  };

  const login = async (username: string, password: string): Promise<LoginResult> => {
    if (username.toLowerCase().trim() !== MOCK_USER.username) return 'unknown_user';
    if (password !== MOCK_USER.password) return 'wrong_password';
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    setUser(MOCK_USER.user);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ savedUser: MOCK_USER.user }));
    return 'ok';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

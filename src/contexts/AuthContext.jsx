import { useCallback, useMemo, useState } from 'react';
import api from '../services/api';

import AuthContext from './auth-context';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (credentials) => {
    setIsLoading(true);
    try {
      const data = await api.post('/auth/login', credentials);
      setUser(data?.user || null);
      setAccessToken(data?.token || null);
      return data;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  const value = useMemo(() => ({
    user,
    accessToken,
    isLoading,
    login,
    logout,
    setUser,
    setAccessToken,
  }), [user, accessToken, isLoading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

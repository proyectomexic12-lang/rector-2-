import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User } from '../services/authService';

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: User | null;
  login: () => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => authService.isAuthenticated());
  const [currentUser, setCurrentUser] = useState<User | null>(() => authService.getCurrentUser());

  useEffect(() => {
    const refreshAndTrack = async () => {
      if (isAuthenticated && currentUser) {
        const updated = await authService.refreshCurrentUser();
        if (updated) setCurrentUser(updated);

        // Track presence
        const sub = authService.trackPresence(currentUser);
        return () => {
          if (sub) sub.unsubscribe();
        };
      }
    };

    const cleanup = refreshAndTrack();
    return () => {
      cleanup.then(unsub => {
        if (unsub) unsub();
      });
    };
  }, [isAuthenticated, currentUser?.email]); // Depend only on email to avoid infinite loops if object ref changes

  const login = () => {
    setIsAuthenticated(true);
    setCurrentUser(authService.getCurrentUser());
  };

  const logout = () => {
    if (confirm("¿Cerrar sesión?")) {
      authService.logout();
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  };

  const refreshUser = async () => {
    if (isAuthenticated) {
      const updated = await authService.refreshCurrentUser();
      if (updated) setCurrentUser(updated);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, currentUser, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

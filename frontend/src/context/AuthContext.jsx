import React, { createContext, useState, useContext, useCallback } from 'react';

const AuthContext = createContext();

function parseToken(token) {
  if (!token) return null;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    // Treat as expired if past exp
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      localStorage.removeItem('token');
      return null;
    }
    return payload; // { user_id, role, exp }
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }) => {
  // Initialise from localStorage — token persists across tabs and reloads.
  // Expiry is enforced by the JWT exp claim (24 h). Logout clears it explicitly.
  const [user, setUser] = useState(() => parseToken(localStorage.getItem('token')));

  // Call this right after api.js setToken() stores the token
  const login = useCallback((token) => {
    setUser(parseToken(token));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('display_user_id');
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

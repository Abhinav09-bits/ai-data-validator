// frontend/src/context/UserContext.jsx
import { createContext, useContext, useState } from 'react';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('adv_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('adv_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('adv_user');
  };

  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('adv_user', JSON.stringify(updated));
  };

  // Keep backward compat
  const updateScore = (newScore) => updateUser({ score: newScore });

  return (
    <UserContext.Provider value={{ user, login, logout, updateUser, updateScore }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
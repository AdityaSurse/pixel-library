import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';

export interface UserProfile {
  uid: string;
  username: string;
  preset: string; // avatar preset name (aditya, meera, etc.)
  presetIndex: number;
  stats: {
    focusSessions: number;
  };
}

export interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  setProfile?: (profile: UserProfile | null) => void;
  setUser?: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading] = useState<boolean>(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        setProfile,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

import React, {createContext, useContext, useEffect, useState} from 'react';

import {getToken, saveToken, removeToken} from './infrastructure/authStorage';

import {HttpUserRepository} from './infrastructure/HttpUserRepository';
import {GetCurrentUser} from './application/GetCurrentUser';
import {User} from './domain/User';

const userRepository = new HttpUserRepository();

const getCurrentUser = new GetCurrentUser(userRepository);

type AuthContextType = {
  token: string | null;
  user: User | null;
  loading: boolean;

  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  getUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [token, setToken] = useState<string | null>(null);

  const [user, setUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);

  const loadUser = async (authToken: string) => {
    const currentUser = await getCurrentUser.execute(authToken);

    setUser(currentUser);
  };

  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedToken = await getToken();

        if (storedToken) {
          setToken(storedToken);

          await loadUser(storedToken);
        }
      } catch (error) {
        console.log('Could not load session:', error);

        await removeToken();

        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  const signIn = async (newToken: string) => {
    await saveToken(newToken);

    setToken(newToken);

    await loadUser(newToken);
  };

  const signOut = async () => {
    await removeToken();

    setToken(null);
    setUser(null);
  };

  const getUser = async () => {
    if (!token) {
      return;
    }

    await loadUser(token);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        signIn,
        signOut,
        getUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}

export function useIsSignedIn() {
  const {token} = useAuth();

  return token !== null;
}

export function useIsSignedOut() {
  const {token} = useAuth();

  return token === null;
}

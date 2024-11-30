// app/providers/AuthProvider.tsx
'use client';

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useLaunchParams } from "@telegram-apps/sdk-react";
import Cookies from "js-cookie";
import api from "@/app/api/refresh/api";

interface User {
  id: string;
  version: number;
  [key: string]: any;
}

interface TxDetails {
  contract_address: string;
  contract_abi: any[];
  input_params: {
    _profileParams: any[];
    _profileData: any[];
  };
}

interface AuthContextType {
  userDetails: User | null;
  isUserCreated: boolean;
  txDetails: TxDetails | null;
  isLoading: boolean;
  error: string | null;
  getUserDetails: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  userDetails: null,
  isUserCreated: false,
  txDetails: null,
  isLoading: false,
  error: null,
  getUserDetails: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userDetails, setUserDetails] = useState<User | null>(null);
  const [isUserCreated, setIsUserCreated] = useState(false);
  const [txDetails, setTxDetails] = useState<TxDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initDataRaw = useLaunchParams()?.initDataRaw;

  const createUser = useCallback(async (initData: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/auth', {}, {
        headers: {
          'x-initdata': initData,
        },
      });

      if (data?.result) {
        setUserDetails(data.result.user);
        setIsUserCreated(true);
        setTxDetails(data.result.signup_tx || null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create user';
      setError(errorMessage);
      console.error('Create user error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getUserDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/users');
      
      if (data?.result) {
        setUserDetails(data.result.user);
        setIsUserCreated(true);
        setTxDetails(data.result.signup_tx || null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get user details';
      setError(errorMessage);
      console.error('Get user details error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initDataRaw) {
      (async () => {
        setIsLoading(true);
        setError(null);
        try {
          const { data } = await api.post('/verify', {
            initData: initDataRaw,
          });
          
          const refresh_token = Cookies.get('refresh_token');
          if (!refresh_token) {
            await createUser(data.initData);
          } else {
            await getUserDetails();
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
          setError(errorMessage);
          console.error('Auth error:', err);
        } finally {
          setIsLoading(false);
        }
      })();
    }
  }, [initDataRaw, createUser, getUserDetails]);

  return (
    <AuthContext.Provider 
      value={{ 
        userDetails, 
        isUserCreated, 
        txDetails, 
        isLoading, 
        error,
        getUserDetails 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
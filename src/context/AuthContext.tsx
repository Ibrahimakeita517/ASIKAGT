import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { authService } from './authService';
import { User } from '../models/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (firstName: string, lastName: string, email: string, password: string, phone: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (firstName: string, lastName: string, phone: string, shopName?: string, businessType?: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    // 1. Vérification rapide de la session
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await authService.findUserById(session.user.id);
          setUser(profile);
        }
      } catch (e) {
        console.log("Erreur init auth:", e);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();

    // 2. Écouter les changements d'état
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await authService.findUserById(session.user.id);
        setUser(profile);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    // 3. Sécurité : On débloque après 3s max
    const timer = setTimeout(() => setIsLoading(false), 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password
      });
      if (error) throw error;
      if (data.user) {
        const profile = await authService.findUserById(data.user.id);
        setUser(profile);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (firstName: string, lastName: string, email: string, password: string, phone: string) => {
    setIsLoading(true);
    try {
      const cleanEmail = email.toLowerCase().trim();
      const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password });
      if (error) throw error;
      if (data.user) {
        const newUser: User = {
          id: data.user.id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: cleanEmail,
          password: '',
          role: 'merchant',
          status: 'active',
          subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          debt: 0,
          createdAt: new Date().toISOString(),
          messages: [],
          phone: phone.trim(),
        };
        await authService.saveUser(newUser);
        setUser(newUser);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateProfile = async (firstName: string, lastName: string, phone: string, shopName?: string, businessType?: string) => {
    if (!user) return;
    const updatedUser = { ...user, firstName, lastName, phone, shopName, businessType };
    await authService.saveUser(updatedUser);
    setUser(updatedUser);
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAdmin, signIn, signUp, signOut, updateProfile, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

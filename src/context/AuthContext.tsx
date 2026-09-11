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
    const checkUser = async () => {
      try {
        // On utilise les imports normaux au lieu de require
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await authService.findUserById(session.user.id);
          if (profile) {
            setUser(profile);
          } else {
            setUser(createDefaultUser(session.user.id, session.user.email || ""));
          }
        }
      } catch (e) {
        console.log("Erreur init auth:", e);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await authService.findUserById(session.user.id);
        if (profile) setUser(profile);
        setIsLoading(false);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    // Timeout de sécurité réduit à 1.5s pour le mode hors-ligne
    const timer = setTimeout(() => setIsLoading(false), 1500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const createDefaultUser = (id: string, email: string): User => ({
    id,
    firstName: "",
    lastName: "",
    email: email,
    password: '',
    role: 'proprietaire', // Par défaut marchand, mais isLoading bloquera la redirection
    isPremium: false,
    status: 'active',
    subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    debt: 0,
    createdAt: new Date().toISOString(),
    messages: [],
    phone: '',
  });

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const cleanEmail = email.toLowerCase().trim();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (error) throw error;

      if (data.user) {
        // On essaye de charger le vrai profil immédiatement
        const profile = await authService.findUserById(data.user.id);
        if (profile) {
          setUser(profile);
        } else {
          // Si pas de profil, on met le défaut mais sans les noms bidons
          setUser(createDefaultUser(data.user.id, data.user.email || cleanEmail));
        }
      }
    } catch (e) {
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (firstName: string, lastName: string, email: string, password: string, phone: string) => {
    setIsLoading(true);
    try {
      const cleanEmail = email.toLowerCase().trim();
      // On passe les infos à Supabase Auth également pour que le trigger SQL puisse les voir
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phone.trim()
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        const newUser: User = {
          ...createDefaultUser(data.user.id, cleanEmail),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
        };

        // 1. On met à jour l'état local IMMEDIATEMENT
        setUser(newUser);

        // 2. On enregistre dans la table public.users (écrase les valeurs par défaut du trigger)
        await authService.saveUser(newUser);
      }
    } catch (e) {
      console.error("Erreur SignUp:", e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
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


import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/lib/types';

export type UserRole = 'customer' | 'driver' | 'admin';
export type Language = 'ar' | 'fr' | 'en';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  language: Language;
  isLoading: boolean;
  signUp: (email: string, password: string, userData: { fullName: string; phone?: string; city?: string; role?: UserRole }) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  setLanguage: (lang: Language) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [language, setLanguage] = useState<Language>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('language') as Language : 'en';
    return saved || 'en';
  });
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to get or create a user profile
  const getOrCreateProfile = async (user: User): Promise<Profile | null> => {
    try {
      const { data: profileData, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileData) {
        return profileData as Profile;
      }

      if (fetchError && fetchError.code === 'PGRST116') {
        const { full_name, phone, city } = user.user_metadata;
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            full_name: full_name || 'New User',
            phone,
            city,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError.message);
          return null;
        }
        return newProfile as Profile;
      }
      
      if (fetchError) {
          console.error('Error fetching profile:', fetchError.message);
      }
    } catch (error) {
      console.error('Unexpected error in getOrCreateProfile:', error);
    }
    return null;
  };

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          const userProfile = await getOrCreateProfile(currentUser);
          setProfile(userProfile);
        }
      } catch (error) {
        console.error("Error fetching session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Auth state changed - only synchronous updates here
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setProfile(null); // Reset profile on auth change

        if (event === 'SIGNED_IN' && currentUser) {
          setIsLoading(true);
          // Defer Supabase calls to prevent deadlock
          setTimeout(() => {
            getOrCreateProfile(currentUser).then((userProfile) => {
              setProfile(userProfile);
              setIsLoading(false);
            });
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userData: { fullName: string; phone?: string; city?: string; role?: UserRole }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: userData.fullName,
          phone: userData.phone,
          city: userData.city,
          role: userData.role || 'customer',
        }
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateLanguage = (lang: Language) => {
    setLanguage(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
    }
  };

  const value = {
    user,
    profile,
    session,
    language,
    isLoading,
    signUp,
    signIn,
    signOut,
    setLanguage: updateLanguage,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

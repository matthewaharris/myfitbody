import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase';

// Drop-in replacement for @clerk/clerk-expo's useAuth/useUser, backed by
// Supabase Auth. Screens keep their existing { getToken, signOut, user }
// usage; only the import line changes.

const AuthContext = createContext(null);

function shapeUser(authUser) {
  if (!authUser) return null;
  const meta = authUser.user_metadata || {};
  const email = authUser.email || '';
  return {
    id: authUser.id,
    emailAddresses: [{ emailAddress: email }],
    primaryEmailAddress: { emailAddress: email },
    firstName: meta.first_name || null,
    lastName: meta.last_name || null,
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoaded(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setIsLoaded(true);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const value = useMemo(
    () => ({
      isLoaded,
      isSignedIn: !!session,
      userId: session?.user?.id ?? null,
      user: shapeUser(session?.user),
      getToken: async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token ?? null;
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, isLoaded]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export function useUser() {
  const { user, isLoaded, isSignedIn } = useAuth();
  return { user, isLoaded, isSignedIn };
}

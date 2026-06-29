import React, { createContext, useState, useEffect, useContext } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { isSignedIn, user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { getToken, signOut } = useClerkAuth();
  
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync / Fetch user profile from DB whenever authentication status changes
  useEffect(() => {
    const syncUserProfile = async () => {
      if (!isUserLoaded) return;

      if (!isSignedIn || !clerkUser) {
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      try {
        // Retrieve Clerk session JWT token
        const clerkToken = await getToken();
        setToken(clerkToken);

        // Sync with backend MongoDB
        const res = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${clerkToken}`
          },
          body: JSON.stringify({
            clerkId: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress,
            name: clerkUser.fullName || clerkUser.username || 'Clerk User',
            role: clerkUser.publicMetadata?.role || 'citizen' // default to citizen
          })
        });

        if (res.ok) {
          const dbUser = await res.json();
          setUser(dbUser);
        } else {
          console.error('Failed to sync user profile with backend.');
          // Fallback to local Clerk metadata if backend fails
          setUser({
            id: clerkUser.id,
            clerkId: clerkUser.id,
            name: clerkUser.fullName || 'Clerk User',
            email: clerkUser.primaryEmailAddress?.emailAddress,
            role: clerkUser.publicMetadata?.role || 'citizen',
            points: clerkUser.publicMetadata?.points || 0,
            badges: clerkUser.publicMetadata?.badges || []
          });
        }
      } catch (err) {
        console.error('Error during Clerk profile sync:', err);
      } finally {
        setLoading(false);
      }
    };

    syncUserProfile();
  }, [isSignedIn, clerkUser, isUserLoaded, getToken]);

  const login = async () => {
    // Redirection or modal triggers are managed by Clerk components directly
    console.log('Login triggered via Clerk context wrapper');
  };

  const register = async () => {
    // Redirection or modal triggers are managed by Clerk components directly
    console.log('Register triggered via Clerk context wrapper');
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut();
      setUser(null);
      setToken(null);
    } catch (err) {
      console.error('Error logging out via Clerk:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async () => {
    if (!isSignedIn || !token) return;
    try {
      const res = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      }
    } catch (err) {
      console.error('Error refreshing profile:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading: !isUserLoaded || loading, login, register, logout, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

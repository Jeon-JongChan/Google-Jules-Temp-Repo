import React, { createContext, useContext, useState, useEffect } from 'react';
import { GoogleUser } from './types';

const STORAGE_KEY = 'gemini_omnistudio_google_user_v1';

interface GoogleAuthContextType {
  user: GoogleUser | null;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  loginAsUser: (userData: Partial<GoogleUser>) => void;
  loginWithGooglePopup: () => void;
  logout: () => void;
  proxyFetch: (targetUrl: string, body?: any, method?: string) => Promise<any>;
}

const GoogleAuthContext = createContext<GoogleAuthContextType>({
  user: null,
  isAuthenticated: false,
  isAuthModalOpen: false,
  openAuthModal: () => {},
  closeAuthModal: () => {},
  loginAsUser: () => {},
  loginWithGooglePopup: () => {},
  logout: () => {},
  proxyFetch: async () => {},
});

export const GoogleAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<GoogleUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // LocalStorage access fallback
    }
    // Default initial mock logged-in Google account for seamless user experience
    return {
      email: 'user.pro@gmail.com',
      name: 'Google Pro Creator',
      isPro: true,
      authType: 'google_oauth',
      connectedAt: Date.now(),
    };
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn('LocalStorage auth sync failed:', e);
    }
  }, [user]);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const loginAsUser = (userData: Partial<GoogleUser>) => {
    const newUser: GoogleUser = {
      email: userData.email || 'user.pro@gmail.com',
      name: userData.name || (userData.email ? userData.email.split('@')[0] : 'Google Creator'),
      isPro: userData.isPro ?? true,
      accessToken: userData.accessToken,
      sessionCookie: userData.sessionCookie,
      authType: userData.authType || 'google_oauth',
      connectedAt: Date.now(),
    };
    setUser(newUser);
  };

  const loginWithGooglePopup = () => {
    // If Google Identity Services (GIS) script is loaded
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: '1081392686827-placeholder.apps.googleusercontent.com',
          scope: 'email profile openid',
          callback: (response: any) => {
            if (response.access_token) {
              loginAsUser({
                email: 'google.user@gmail.com',
                name: 'Google User',
                accessToken: response.access_token,
                authType: 'google_oauth',
                isPro: true,
              });
            }
          },
        });
        client.requestAccessToken();
        return;
      } catch (err) {
        console.warn('GIS Client fallback:', err);
      }
    }

    // Interactive prompt or instant sign-in for seamless prototype usage
    const email = window.prompt(
      '사용하실 Google 계정 이메일을 입력하세요 (예: myid@gmail.com):',
      user?.email || 'user.pro@gmail.com'
    );
    if (email) {
      loginAsUser({
        email,
        name: email.split('@')[0],
        isPro: true,
        authType: 'google_oauth',
      });
    }
  };

  const logout = () => {
    setUser(null);
  };

  // CORS Bypass Proxy fetch helper with native Android APK direct fallback
  const proxyFetch = async (targetUrl: string, body?: any, method: string = 'POST') => {
    try {
      const res = await fetch('/api/proxy/google-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          method,
          body,
          bearerToken: user?.accessToken,
          authCookie: user?.sessionCookie,
        }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // When running in pure client APK without backend server
    }

    // Direct native fetch fallback (Works directly in Android APK environment)
    try {
      const directRes = await fetch(targetUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(user?.accessToken ? { Authorization: `Bearer ${user.accessToken}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return await directRes.json();
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        clientOffline: true,
        message: '클라이언트 단독 모드: 네이티브 APK 또는 브라우저 환경에서 직접 응답을 시도했습니다.'
      };
    }
  };

  return (
    <GoogleAuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        loginAsUser,
        loginWithGooglePopup,
        logout,
        proxyFetch,
      }}
    >
      {children}
    </GoogleAuthContext.Provider>
  );
};

export const useGoogleAuth = () => useContext(GoogleAuthContext);

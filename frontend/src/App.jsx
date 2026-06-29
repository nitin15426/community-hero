import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import MapPage from './pages/MapPage';
import ReportPage from './pages/ReportPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';

function PageContainer() {
  const [activePage, setActivePage] = useState('home');
  const { user, loading } = useAuth();

  // Route Guarding: redirect to sign-in page if not logged in and accessing protected pages
  const isProtected = ['report', 'admin', 'profile'].includes(activePage) === false && activePage !== 'home' && activePage !== 'map' && activePage !== 'analytics';

  const navigateTo = (pageId) => {
    // Admin check
    if (pageId === 'admin' && (!user || user.role !== 'authority')) {
      setActivePage('home');
      return;
    }
    // Protected check
    if (['report'].includes(pageId) && !user) {
      setActivePage('profile');
      return;
    }
    setActivePage(pageId);
  };

  const renderPage = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-zinc-400">
          <div className="w-12 h-12 border-4 border-emerald-500/25 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-semibold tracking-wide uppercase">Initializing Platform...</p>
        </div>
      );
    }

    switch (activePage) {
      case 'home':
        return <Home setActivePage={navigateTo} />;
      case 'map':
        return <MapPage setActivePage={navigateTo} />;
      case 'report':
        return user ? <ReportPage setActivePage={navigateTo} /> : <ProfilePage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'profile':
        return <ProfilePage />;
      case 'admin':
        return user?.role === 'authority' ? <AdminPage /> : <Home setActivePage={navigateTo} />;
      default:
        return <Home setActivePage={navigateTo} />;
    }
  };
  return (
    <div className="min-h-screen text-[#f4f4f5] flex flex-col relative z-0">
      {/* Background Video */}
      <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden pointer-events-none select-none">
        <video
          autoPlay
          loop
          muted={true}
          playsInline
          ref={(el) => {
            if (el) {
              el.muted = true;
            }
          }}
          className="w-full h-full object-cover"
        >
          <source src="/21233-316116300_medium.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay to blend the video with the theme while maintaining text legibility */}
        <div className="absolute inset-0 bg-zinc-950/35" />
      </div>

      <Navbar activePage={activePage} setActivePage={navigateTo} />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderPage()}
      </main>
      <footer className="border-t border-zinc-900 bg-zinc-950/60 py-6 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} Community Hero Platform. Powered by Gemini AI. Empowering Citizens, Accelerating Action.</p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PageContainer />
    </AuthProvider>
  );
}

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, MapPin, BarChart2, PlusCircle, User, LogOut, Award, Menu, X } from 'lucide-react';

export default function Navbar({ activePage, setActivePage }) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navigationItems = [
    { id: 'home', label: 'Overview', icon: Shield },
    { id: 'map', label: 'Live Map', icon: MapPin },
    { id: 'report', label: 'Report Issue', icon: PlusCircle },
    { id: 'analytics', label: 'Hotspot Insights', icon: BarChart2 },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  // Only show Admin Panel if user is authority
  if (user && user.role === 'authority') {
    navigationItems.push({ id: 'admin', label: 'Authority Board', icon: Shield });
  }

  const handleNavClick = (pageId) => {
    setActivePage(pageId);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 glassmorphism border-b border-zinc-800 text-zinc-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleNavClick('home')}>
            <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/30 text-emerald-400 shadow-glow">
              <Shield className="h-6 w-6" />
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-200 to-emerald-400 bg-clip-text text-transparent">
              COMMUNITY<span className="text-emerald-400">HERO</span>
            </span>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-glow'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* User Widget / Auth Controls */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                {/* Points indicator */}
                {user.role === 'citizen' && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 font-semibold text-xs shadow-glow">
                    <Award className="h-3.5 w-3.5" />
                    <span>{user.points || 0} Hero Points</span>
                  </div>
                )}
                {user.role === 'authority' && (
                  <span className="px-2.5 py-0.5 bg-rose-500/15 border border-rose-500/35 rounded text-rose-400 text-xs font-semibold uppercase tracking-wider">
                    Official Authority
                  </span>
                )}

                {/* Logged in User Dropdown Info */}
                <div className="flex items-center gap-2 text-sm border-l border-zinc-800 pl-4">
                  <span className="font-semibold text-zinc-300 max-w-[120px] truncate">{user.name}</span>
                  <button 
                    onClick={logout} 
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Log Out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => handleNavClick('profile')}
                className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold px-4 py-2 rounded-lg text-sm transition-all shadow-glow"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-zinc-950 border-b border-zinc-800">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-base font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </button>
              );
            })}

            {user ? (
              <div className="pt-4 pb-2 border-t border-zinc-800 px-3 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-zinc-200 text-sm">{user.name}</span>
                  {user.role === 'citizen' ? (
                    <span className="text-xs text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {user.points} Pts
                    </span>
                  ) : (
                    <span className="text-xs text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                      Official
                    </span>
                  )}
                </div>
                <button
                  onClick={logout}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-rose-400 hover:bg-rose-500/10 text-sm font-semibold transition-all"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </button>
              </div>
            ) : (
              <div className="pt-4 pb-2 border-t border-zinc-800 px-3 mt-4">
                <button
                  onClick={() => handleNavClick('profile')}
                  className="flex items-center justify-center w-full py-2.5 bg-emerald-500 text-zinc-950 font-bold rounded-lg text-sm transition-all"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

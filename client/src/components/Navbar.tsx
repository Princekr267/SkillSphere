import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Globe, LogOut, Menu, X } from 'lucide-react';
import { NotificationBell } from './NotificationBell';


export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  const dashboardPath = user
    ? user.role === 'admin'
      ? '/admin'
      : user.role === 'client'
      ? '/client-dashboard'
      : '/freelancer-dashboard'
    : '/';

  return (
    <nav className="bg-paper border-b border-line-gray sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Brand */}
          <div className="flex items-center">
            <Link 
              to={dashboardPath} 
              className="flex items-center space-x-2 group"
              onClick={() => setMobileOpen(false)}
            >
              <div className="h-8 w-8 bg-route-teal flex items-center justify-center text-white font-bold rounded-sm">
                <Globe className="h-4 w-4" />
              </div>
              <span className="text-xl font-black tracking-tight font-display text-ink uppercase">
                SkillSphere
              </span>
            </Link>
          </div>

          {/* Navigation Route Line (desktop only) */}
          <div className="flex-grow max-w-xl mx-8 hidden md:block relative">
            {/* Horizontal route line */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-line-gray"></div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-route-teal animate-draw-line -z-10"></div>

            <div className="relative flex justify-around items-center">
              
              {/* Station 1: Dashboard */}
              <div className="flex flex-col items-center">
                <Link 
                  to={dashboardPath}
                  className="flex flex-col items-center group"
                >
                  <span className={`text-[10px] font-display uppercase tracking-widest mb-1.5 transition-colors ${
                    user ? 'text-ink' : 'text-slate font-bold'
                  }`}>
                    Dashboard
                  </span>
                  <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                    user ? 'bg-route-teal border-route-teal scale-110 shadow-sm' : 'bg-paper border-slate group-hover:border-route-teal'
                  }`}></div>
                </Link>
              </div>

              {/* Station 2: Local Node */}
              <div className="flex flex-col items-center">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-display uppercase tracking-widest mb-1.5 text-slate">
                    Local Node
                  </span>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full border-2 border-line-gray bg-paper"></div>
                    {user && (
                      <span className="text-[9px] font-mono text-slate bg-line-gray/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        {user.location.city}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Station 3 (Freelancer only): Browse Gigs */}
              {user?.role === 'freelancer' && (
                <div className="flex flex-col items-center">
                  <Link to="/gigs" className="flex flex-col items-center group">
                    <span className={`text-[10px] font-display uppercase tracking-widest mb-1.5 transition-colors ${
                      isActive('/gigs') ? 'text-route-teal font-bold' : 'text-slate group-hover:text-ink'
                    }`}>
                      Browse Gigs
                    </span>
                    <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                      isActive('/gigs') ? 'bg-route-teal border-route-teal scale-110' : 'bg-paper border-slate group-hover:border-route-teal'
                    }`}></div>
                  </Link>
                </div>
              )}

              {/* Station 4: Platform Status */}
              <div className="flex flex-col items-center">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-display uppercase tracking-widest mb-1.5 text-slate">
                    Platform Status
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <div className="w-3 h-3 rounded-full bg-route-teal border-2 border-route-teal animate-pulse"></div>
                    <span className="text-[9px] font-mono text-route-teal uppercase tracking-widest">
                      Live
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>


          {/* User Controls (desktop) */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                {/* User Info & Badge */}
                <div className="flex items-center space-x-3 pr-4 border-r border-line-gray">
                  <div className="flex flex-col text-right">
                    <span className="text-sm font-bold text-ink font-sans">{user.name}</span>
                    <span className="text-[10px] font-mono text-slate uppercase tracking-wider">
                      {user.role}
                    </span>
                  </div>
                  <div className="h-9 w-9 rounded-sm bg-slate/10 border border-slate/30 flex items-center justify-center text-ink font-bold font-display uppercase text-sm overflow-hidden flex-shrink-0">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                    ) : (
                      user.name.charAt(0)
                    )}
                  </div>
                </div>

                {/* Notifications Bell */}
                <NotificationBell />

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate hover:text-signal-coral hover:bg-line-gray/20 transition-all rounded"
                  title="Logout"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-xs font-display uppercase tracking-widest text-slate hover:text-ink transition-colors px-3 py-2"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-display uppercase tracking-widest text-white bg-signal-coral hover:bg-signal-coral/90 px-4 py-2.5 rounded-sm transition-all"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile: right side controls */}
          <div className="flex md:hidden items-center space-x-2">
            {user && <NotificationBell />}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 text-slate hover:text-ink transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-paper border-t border-line-gray animate-slide-up">
          <div className="px-4 py-4 space-y-1">
            {user ? (
              <>
                {/* User info strip */}
                <div className="flex items-center space-x-3 pb-4 mb-2 border-b border-line-gray">
                  <div className="h-10 w-10 rounded-sm bg-slate/10 border border-slate/30 flex items-center justify-center text-ink font-bold font-display uppercase text-sm overflow-hidden flex-shrink-0">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                    ) : (
                      user.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink">{user.name}</p>
                    <p className="text-[10px] font-mono text-slate uppercase tracking-wider">{user.role} · {user.location.city}</p>
                  </div>
                </div>

                {/* Nav links */}
                <Link
                  to={dashboardPath}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center space-x-3 px-3 py-3 rounded-sm text-sm font-sans text-ink hover:bg-line-gray/20 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-route-teal flex-shrink-0" />
                  <span>Dashboard</span>
                </Link>

                {user.role === 'freelancer' && (
                  <Link
                    to="/gigs"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-3 rounded-sm text-sm font-sans transition-colors ${
                      isActive('/gigs') ? 'text-route-teal font-bold bg-route-teal/5' : 'text-ink hover:bg-line-gray/20'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive('/gigs') ? 'bg-route-teal' : 'bg-line-gray'}`} />
                    <span>Browse Gigs</span>
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-3 py-3 rounded-sm text-sm font-sans text-signal-coral hover:bg-signal-coral/5 transition-colors"
                >
                  <LogOut className="h-4 w-4 flex-shrink-0" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-center px-4 py-3 rounded-sm text-sm font-bold font-display uppercase tracking-widest text-ink border border-line-gray hover:border-slate transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-center px-4 py-3 rounded-sm text-sm font-bold font-display uppercase tracking-widest text-white bg-signal-coral hover:bg-signal-coral/90 transition-all"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

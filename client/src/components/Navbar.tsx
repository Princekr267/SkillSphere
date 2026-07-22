import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Globe, LogOut, Menu, X, MessageSquare, Sun, Moon } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { io } from 'socket.io-client';
import api from '../utils/api';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

const SOCKET_URL = 'http://localhost:3000';

// Navigation header styled in Retro-pop visual style with dark mode switch
export const Navbar: React.FC = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Dark Mode state initialization
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/gigs/messages/unread');
      if (res.data.success) {
        setUnreadMessages(res.data.count);
      }
    } catch (err) {
      console.error('Error fetching unread message count:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
    }
  }, [location.pathname, user]);

  useEffect(() => {
    if (!token || !user) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {});

    socket.on('new_notification', (notif: any) => {
      if (notif.type === 'new_message') {
        setUnreadMessages(prev => prev + 1);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token, user]);

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
    <nav className="bg-cream border-b-2 border-ink sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <Link 
              to={dashboardPath} 
              className="flex items-center space-x-2 group"
              onClick={() => setMobileOpen(false)}
            >
              <div className="h-9 w-9 bg-accent-amber flex items-center justify-center text-ink font-bold border-2 border-ink rounded-lg shadow-retro-sm">
                <Globe className="h-4.5 w-4.5" />
              </div>
              <span className="text-xl font-display font-black tracking-tight text-ink uppercase">
                SkillSphere
              </span>
            </Link>
            
            <Badge variant="teal" className="text-[8px] font-mono shadow-none uppercase font-black px-1.5 py-0.5 tracking-wider hidden sm:inline-flex items-center border-2 border-ink bg-accent-teal text-ink">
              <span className="w-1.5 h-1.5 rounded-full bg-cream inline-block animate-pulse mr-1"></span>
              <span>Live Node</span>
            </Badge>
          </div>

          {/* Navigation Route Line (desktop only) */}
          <div className="flex-grow max-w-xl mx-8 hidden md:block relative">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[4px] bg-ink/10 dark:bg-cream/15 border-y border-ink/40"></div>
            <div className="relative flex justify-around items-center">
              
              {/* Station 1: Dashboard */}
              <div className="flex flex-col items-center">
                <Link to={dashboardPath} className="flex flex-col items-center group">
                  <span className={`text-[10px] font-display font-bold uppercase tracking-wider mb-1.5 transition-colors ${
                    isActive(dashboardPath) ? 'text-accent-teal font-extrabold' : 'text-ink/60 group-hover:text-ink'
                  }`}>
                    Dashboard
                  </span>
                  <div className={`w-4.5 h-4.5 border-2 border-ink transition-all rounded-md ${
                    isActive(dashboardPath) ? 'bg-accent-amber scale-110 shadow-retro-sm' : 'bg-cream group-hover:bg-accent-amber/20'
                  }`}></div>
                </Link>
              </div>

              {/* Station 2: Marketplace / Gigs */}
              <div className="flex flex-col items-center">
                <Link to="/gigs" className="flex flex-col items-center group">
                  <span className={`text-[10px] font-display font-bold uppercase tracking-wider mb-1.5 transition-colors ${
                    isActive('/gigs') ? 'text-accent-teal font-extrabold' : 'text-ink/60 group-hover:text-ink'
                  }`}>
                    Marketplace
                  </span>
                  <div className={`w-4.5 h-4.5 border-2 border-ink transition-all rounded-md ${
                    isActive('/gigs') ? 'bg-accent-teal scale-110 shadow-retro-sm' : 'bg-cream group-hover:bg-accent-teal/20'
                  }`}></div>
                </Link>
              </div>

              {/* Station 3: Node Profile */}
              {user && (
                <div className="flex flex-col items-center">
                  <Link 
                    to={user.role === 'freelancer' ? `/profile/${user._id}` : dashboardPath} 
                    className="flex flex-col items-center group"
                  >
                    <span className={`text-[10px] font-display font-bold uppercase tracking-wider mb-1.5 transition-colors ${
                      (user.role === 'freelancer' && isActive(`/profile/${user._id}`)) ? 'text-accent-teal font-extrabold' : 'text-ink/60 group-hover:text-ink'
                    }`}>
                      Node Profile
                    </span>
                    <div className={`w-4.5 h-4.5 border-2 border-ink transition-all rounded-md ${
                      (user.role === 'freelancer' && isActive(`/profile/${user._id}`)) ? 'bg-accent-pink scale-110 shadow-retro-sm' : 'bg-cream group-hover:bg-accent-pink/20'
                    }`}></div>
                  </Link>
                </div>
              )}

            </div>
          </div>

          {/* User Controls (desktop) */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Dark Mode toggle button */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 border-2 border-ink bg-cream text-ink rounded-lg shadow-retro-sm hover:bg-accent-amber/20 cursor-pointer active:translate-y-[1px]"
              title={darkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {darkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>

            {user ? (
              <>
                {/* Location Info Badge */}
                <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 border-2 border-ink bg-cream text-ink rounded-lg text-xs font-mono font-bold">
                  <span className="w-2 h-2 rounded-full bg-accent-teal inline-block"></span>
                  <span>{user.location.city}</span>
                </div>

                {/* User Info & Badge */}
                <div className="flex items-center space-x-3 pr-4 border-r-2 border-ink">
                  <div className="flex flex-col text-right">
                    <span className="text-sm font-bold text-ink">{user.name}</span>
                    <span className="text-[10px] font-mono text-ink/60 uppercase tracking-wider">
                      {user.role}
                    </span>
                  </div>
                  <div className="h-9 w-9 bg-cream border-2 border-ink flex items-center justify-center text-ink font-bold font-display uppercase text-sm overflow-hidden flex-shrink-0 rounded-lg shadow-retro-sm">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                    ) : (
                      user.name.charAt(0)
                    )}
                  </div>
                </div>

                {/* Unread Messages Mail Badge */}
                <Link
                  to={dashboardPath}
                  className="relative p-2 text-ink hover:bg-accent-amber/15 rounded-lg border-2 border-transparent transition-all"
                  title="Unread Messages"
                >
                  <MessageSquare className="h-5 w-5 text-ink" />
                  {unreadMessages > 0 && (
                    <span className="absolute top-0 right-0 h-4 w-4 bg-accent-coral text-ink font-mono text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-ink">
                      {unreadMessages}
                    </span>
                  )}
                </Link>

                {/* Notifications Bell */}
                <NotificationBell />

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="p-2 text-ink border-2 border-ink bg-cream hover:bg-accent-coral rounded-lg shadow-retro-sm active:translate-y-[1px] cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-xs font-display uppercase tracking-widest text-ink hover:underline px-3 py-2 font-bold"
                >
                  Login
                </Link>
                <Link to="/register">
                  <Button variant="coral" size="md">
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile: right side controls */}
          <div className="flex md:hidden items-center space-x-2">
            {/* Dark Mode toggle button mobile */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 border-2 border-ink bg-cream text-ink rounded-lg shadow-retro-sm cursor-pointer"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {user && (
              <>
                <Link
                  to={dashboardPath}
                  className="relative p-2 text-ink"
                  title="Unread Messages"
                  onClick={() => setMobileOpen(false)}
                >
                  <MessageSquare className="h-5 w-5 text-ink" />
                  {unreadMessages > 0 && (
                    <span className="absolute top-0.5 right-0.5 h-3.5 w-3.5 bg-accent-coral text-ink font-mono text-[8px] font-bold rounded-full flex items-center justify-center border border-ink">
                      {unreadMessages}
                    </span>
                  )}
                </Link>
                <NotificationBell />
              </>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 text-ink border-2 border-ink bg-cream rounded-lg shadow-retro-sm cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-cream border-t-2 border-ink animate-slide-up">
          <div className="px-4 py-4 space-y-2">
            {user ? (
              <>
                {/* User info strip */}
                <div className="flex items-center space-x-3 pb-4 mb-2 border-b-2 border-ink">
                  <div className="h-10 w-10 bg-cream border-2 border-ink flex items-center justify-center text-ink font-bold font-display uppercase text-sm overflow-hidden flex-shrink-0 rounded-lg">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                    ) : (
                      user.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink">{user.name}</p>
                    <p className="text-[10px] font-mono text-ink/60 uppercase tracking-wider">{user.role} · {user.location.city}</p>
                  </div>
                </div>

                {/* Nav links */}
                <Link
                  to={dashboardPath}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-sans font-bold text-ink border-2 border-transparent hover:border-ink hover:bg-accent-amber/25 transition-all"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-accent-amber border border-ink flex-shrink-0" />
                  <span>Dashboard</span>
                </Link>

                {user.role === 'freelancer' && (
                  <Link
                    to="/gigs"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-sans font-bold transition-all border-2 ${
                      isActive('/gigs') ? 'bg-accent-teal/20 border-ink' : 'border-transparent hover:border-ink hover:bg-accent-teal/15'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-accent-teal border border-ink flex-shrink-0" />
                    <span>Browse Gigs</span>
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-sans font-bold text-accent-coral hover:bg-accent-coral/10 border-2 border-transparent hover:border-ink transition-all cursor-pointer"
                >
                  <LogOut className="h-4 w-4 flex-shrink-0 text-ink" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-center px-4 py-2.5 rounded-lg text-sm font-bold font-display uppercase tracking-widest text-ink border-2 border-ink bg-cream shadow-retro-sm"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-center px-4 py-2.5 rounded-lg text-sm font-bold font-display uppercase tracking-widest text-ink bg-accent-coral border-2 border-ink shadow-retro-sm"
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

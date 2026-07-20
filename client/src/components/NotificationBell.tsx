import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import api from '../utils/api';
import { Badge } from './ui/Badge';

interface Notification {
  _id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string;
}

const SOCKET_URL = 'http://localhost:3000';

export const NotificationBell: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.notifications);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !user) return;

    fetchNotifications();

    // Setup Socket connection
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      // Automatic room joins handled on server side for 'user-<id>'
    });

    socket.on('new_notification', (notif: Notification) => {
      setNotifications(prev => [notif, ...prev]);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [token, user]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    setIsOpen(false);
    if (!notif.read) {
      try {
        await api.put(`/notifications/${notif._id}/read`);
        setNotifications(prev =>
          prev.map(n => (n._id === notif._id ? { ...n, read: true } : n))
        );
      } catch (err) {
        console.error('Error marking notification read:', err);
      }
    }
    navigate(notif.link);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-ink hover:text-ink hover:bg-accent-teal/15 transition-all rounded-lg cursor-pointer"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-accent-coral text-ink border border-ink font-mono text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-cream border-2 border-ink rounded-lg shadow-retro z-50 overflow-hidden text-left">
          <div className="px-4 py-2.5 border-b-2 border-ink flex items-center justify-between bg-cream">
            <span className="text-[10px] font-bold font-display uppercase tracking-widest text-ink">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[9px] font-mono text-accent-teal hover:underline uppercase tracking-wider flex items-center space-x-1 cursor-pointer font-bold"
              >
                <Check className="h-3 w-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y-2 divide-ink/10">
            {loading && notifications.length === 0 ? (
              <div className="p-4 flex justify-center">
                <Loader2 className="h-4 w-4 text-accent-teal animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink/60 font-sans">
                You are all caught up node!
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 text-left cursor-pointer transition-colors hover:bg-accent-amber/10 ${
                    !notif.read ? 'bg-accent-teal/10 font-semibold' : ''
                  }`}
                >
                  <p className="text-xs text-ink font-display uppercase tracking-tight font-bold mb-0.5">
                    {notif.title}
                  </p>
                  <p className="text-xs text-ink/75 font-sans leading-relaxed">{notif.body}</p>
                  <p className="text-[9px] font-mono text-ink/40 mt-1">
                    {new Date(notif.createdAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

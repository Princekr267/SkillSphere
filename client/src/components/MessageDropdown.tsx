import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';
import { Badge } from './ui/Badge';

export interface UnreadConversation {
  gigId: string;
  gigTitle: string;
  otherParty: {
    name: string;
    avatar?: string;
  };
  unreadCount: number;
  lastMessage: {
    body: string;
    createdAt: string;
  };
}

interface MessageDropdownProps {
  unreadMessagesCount: number;
  onUnreadChange?: (newCount: number) => void;
}

export const MessageDropdown: React.FC<MessageDropdownProps> = ({
  unreadMessagesCount,
  onUnreadChange,
}) => {
  const { user, token } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<UnreadConversation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/messages/unread/conversations');
      if (res.data.success) {
        setConversations(res.data.conversations);
        const total = res.data.conversations.reduce(
          (sum: number, c: UnreadConversation) => sum + c.unreadCount,
          0
        );
        if (onUnreadChange) onUnreadChange(total);
      }
    } catch (err) {
      console.error('Error fetching unread conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch conversations whenever dropdown opens
  useEffect(() => {
    if (isOpen && token && user) {
      fetchConversations();
    }
  }, [isOpen, token, user]);

  // Subscribe to real-time notification socket for live updates
  useEffect(() => {
    if (!socket) return;

    const handleNewMessageNotification = (notif: any) => {
      if (notif.type === 'new_message') {
        fetchConversations();
      }
    };

    socket.on('new_notification', handleNewMessageNotification);

    return () => {
      socket.off('new_notification', handleNewMessageNotification);
    };
  }, [socket]);

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

  const handleConversationClick = async (conv: UnreadConversation) => {
    setIsOpen(false);
    try {
      await api.put(`/messages/gig/${conv.gigId}/read`);
    } catch (err) {
      console.error('Error marking conversation read:', err);
    }

    // Update local state
    setConversations(prev => prev.filter(c => c.gigId !== conv.gigId));
    if (onUnreadChange) {
      const remainingCount = Math.max(0, unreadMessagesCount - conv.unreadCount);
      onUnreadChange(remainingCount);
    }

    navigate(`/gigs/${conv.gigId}/chat`);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Message Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-ink hover:text-ink hover:bg-accent-amber/15 transition-all rounded-lg cursor-pointer"
        title="Unread Messages"
        aria-label="Unread Messages"
      >
        <MessageSquare className="h-5 w-5 text-ink" />
        {unreadMessagesCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-accent-coral text-ink border border-ink font-mono text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-cream border-2 border-ink rounded-lg shadow-retro z-50 overflow-hidden text-left">
          <div className="px-4 py-2.5 border-b-2 border-ink flex items-center justify-between bg-cream">
            <span className="text-[10px] font-bold font-display uppercase tracking-widest text-ink">
              Messages
            </span>
            {unreadMessagesCount > 0 && (
              <span className="text-[9px] font-mono text-ink/60 font-bold uppercase">
                {unreadMessagesCount} unread
              </span>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y-2 divide-ink/10">
            {loading && conversations.length === 0 ? (
              <div className="p-4 flex justify-center">
                <Loader2 className="h-4 w-4 text-accent-teal animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink/60 font-sans">
                No unread messages
              </div>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.gigId}
                  onClick={() => handleConversationClick(conv)}
                  className="p-3.5 text-left cursor-pointer transition-colors hover:bg-accent-amber/10 bg-accent-teal/10 font-semibold"
                >
                  <div className="flex items-start space-x-3">
                    <div className="h-8 w-8 rounded-full bg-cream border-2 border-ink overflow-hidden flex items-center justify-center flex-shrink-0 font-bold text-xs">
                      {conv.otherParty.avatar ? (
                        <img
                          src={conv.otherParty.avatar}
                          alt={conv.otherParty.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        conv.otherParty.name.charAt(0)
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-display text-ink truncate uppercase">
                          {conv.otherParty.name}
                        </span>
                        <span className="text-[8px] font-mono text-ink/50 flex-shrink-0">
                          {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-accent-teal font-bold truncate">
                        {conv.gigTitle}
                      </p>
                      <p className="text-xs text-ink/75 font-sans truncate mt-0.5 font-normal">
                        {conv.lastMessage.body || 'Attachment / Media'}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <Badge variant="coral" className="text-[8px] px-1.5 py-0 shadow-none font-mono flex-shrink-0">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

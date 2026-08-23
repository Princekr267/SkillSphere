import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api, { BACKEND_URL } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { ArrowLeft, Send, Loader2, AlertCircle, Paperclip, File as FileIcon, CheckCheck, Check } from 'lucide-react';

interface Message {
  _id: string;
  gigId: string;
  senderId: { _id: string; name: string; role: string };
  body: string;
  read: boolean;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  sentAt: string;
}

const SOCKET_URL = BACKEND_URL;

export const GigChat: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { socket, connectionError } = useSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gigTitle, setGigTitle] = useState('Gig Chat');
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const chatFileRef = useRef<HTMLInputElement | null>(null);

  // Typing state
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load history from REST
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const [msgRes, gigRes] = await Promise.all([
          api.get(`/gigs/${id}/messages`),
          api.get(`/gigs/${id}`),
        ]);
        if (msgRes.data.success) setMessages(msgRes.data.messages);
        if (gigRes.data.success) {
          const gig = gigRes.data.gig;
          setGigTitle(gig.title);
          const uid = user?._id;
          const otherId = gig.clientId?._id === uid
            ? (gig.acceptedFreelancerId?._id || gig.acceptedFreelancerId)
            : (gig.clientId?._id || gig.clientId);
          setOtherUserId(otherId);
        }
      } catch {
        setError('Failed to load chat history. Make sure you are a participant.');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [id, user]);

  // Set up all socket listeners and join/leave the gig room
  useEffect(() => {
    if (!socket) return;

    // Join the gig room — handle both already-connected and reconnect cases
    if (socket.connected) {
      socket.emit('join_room', id);
      socket.emit('get_online_users');
    }

    const handleConnect = () => {
      socket.emit('join_room', id);
      socket.emit('get_online_users');
    };

    const handleOnlineUsersList = (list: string[]) => {
      setOnlineUsers(list);
    };

    const handleUserStatusChanged = ({ userId, status }: { userId: string; status: 'online' | 'offline' }) => {
      setOnlineUsers(prev => {
        if (status === 'online') {
          if (prev.includes(userId)) return prev;
          return [...prev, userId];
        } else {
          return prev.filter(p => p !== userId);
        }
      });
    };

    const handleReceiveMessage = (msg: Message) => {
      setMessages(prev => {
        if (prev.some(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    };

    const handleUserTyping = ({ userId }: { userId: string }) => {
      if (userId === otherUserId) setOtherUserTyping(true);
    };

    const handleUserStopTyping = ({ userId }: { userId: string }) => {
      if (userId === otherUserId) setOtherUserTyping(false);
    };

    const handleMessagesReadReceipt = ({ readerId }: { readerId: string }) => {
      if (readerId === otherUserId) {
        setMessages(prev =>
          prev.map(m => (m.senderId?._id === user?._id ? { ...m, read: true } : m))
        );
      }
    };

    const handleError = (err: string) => {
      setError(err);
    };

    socket.on('connect', handleConnect);
    socket.on('online_users_list', handleOnlineUsersList);
    socket.on('user_status_changed', handleUserStatusChanged);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);
    socket.on('messages_read_receipt', handleMessagesReadReceipt);
    socket.on('error', handleError);

    return () => {
      // Leave the room — don't disconnect the shared socket
      socket.emit('leave_room', id);
      socket.off('connect', handleConnect);
      socket.off('online_users_list', handleOnlineUsersList);
      socket.off('user_status_changed', handleUserStatusChanged);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
      socket.off('messages_read_receipt', handleMessagesReadReceipt);
      socket.off('error', handleError);
    };
  }, [socket, id, otherUserId, user]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherUserTyping]);

  // Read receipts sender trigger
  useEffect(() => {
    if (socket && messages.length > 0) {
      socket.emit('read_messages', { gigId: id });
    }
  }, [messages, id, socket]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (socket) {
      socket.emit('typing', { gigId: id });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket?.emit('stop_typing', { gigId: id });
      }, 2000);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket || connectionError) return;
    
    // Stop typing immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit('stop_typing', { gigId: id });
    
    socket.emit('send_message', { gigId: id, body: input.trim() });
    setInput('');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('attachment', file);

    setLoadingFile(true);
    try {
      const res = await api.post('/gigs/messages/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success && socket) {
        socket.emit('send_message', {
          gigId: id,
          body: `Shared attachment: ${res.data.fileName}`,
          fileUrl: res.data.fileUrl,
          fileName: res.data.fileName,
          fileSize: res.data.fileSize
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'File upload failed. Ensure it is under 5MB.');
    } finally {
      setLoadingFile(false);
    }
  };

  const isMine = (msg: Message) => msg.senderId?._id === user?._id;
  const isOtherUserOnline = otherUserId ? onlineUsers.includes(otherUserId) : false;

  const isImage = (filename?: string) => {
    if (!filename) return false;
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '');
  };

  const handleBack = () => {
    if (location.state?.from) {
      navigate(location.state.from);
    } else {
      navigate(`/gigs/${id}`);
    }
  };

  return (
    <div className="flex flex-col flex-grow bg-cream animate-fade-in font-sans transition-colors duration-200" style={{ height: 'calc(100vh - 80px)' }}>

      {/* Header */}
      <div className="flex-shrink-0 bg-cream border-b-2 border-ink px-2.5 sm:px-4 py-3 flex items-center space-x-2.5 sm:space-x-3 text-left min-w-0">
        <button onClick={handleBack} className="text-ink/60 hover:text-ink cursor-pointer flex-shrink-0" title="Go Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-grow min-w-0">
          <div className="flex items-center space-x-2 min-w-0">
            <h2 className="font-bold text-sm text-ink truncate min-w-0 flex-1">{gigTitle}</h2>
            {isOtherUserOnline ? (
              <span className="flex items-center space-x-1 text-[10px] text-accent-teal font-bold font-mono flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-accent-teal animate-pulse"></span>
                <span>ONLINE</span>
              </span>
            ) : (
              <span className="text-[10px] text-ink/40 font-mono flex-shrink-0">OFFLINE</span>
            )}
          </div>
          <p className="text-[10px] text-ink/60 font-mono truncate">End-to-end encrypted direct socket channel</p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-grow overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-accent-teal" />
          </div>
        ) : error ? (
          <div className="flex items-center space-x-2 text-accent-coral text-xs justify-center py-8">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 text-ink/40 text-xs font-mono">
            No messages yet. Send a message to start negotiating details!
          </div>
        ) : (
          messages.map((msg, index) => {
            const mine = isMine(msg);
            return (
              <div
                key={msg._id || index}
                className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
              >
                {!mine && (
                  <span className="text-[9px] font-bold text-ink/60 mb-0.5 px-1 uppercase font-display">
                    {msg.senderId?.name || 'User'}
                  </span>
                )}
                <div
                  className={`max-w-[75%] sm:max-w-md px-3.5 py-2.5 rounded-xl border-2 border-ink text-xs shadow-retro-sm text-left ${
                    mine
                      ? 'bg-accent-amber text-ink rounded-br-none'
                      : 'bg-cream text-ink rounded-bl-none'
                  }`}
                >
                  {/* File attachment handling */}
                  {msg.fileUrl && (
                    <div className="mb-2">
                      {isImage(msg.fileName) ? (
                        <a href={msg.fileUrl.startsWith('http') ? msg.fileUrl : `${BACKEND_URL}${msg.fileUrl}`} target="_blank" rel="noopener noreferrer">
                          <img
                            src={msg.fileUrl.startsWith('http') ? msg.fileUrl : `${BACKEND_URL}${msg.fileUrl}`}
                            alt={msg.fileName || 'Attachment'}
                            className="max-h-48 rounded border border-ink/20 object-cover hover:opacity-90 transition-opacity"
                          />
                        </a>
                      ) : (
                        <a
                          href={msg.fileUrl.startsWith('http') ? msg.fileUrl : `${BACKEND_URL}${msg.fileUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1.5 p-2 bg-ink/5 border border-ink/10 rounded hover:bg-ink/10 transition-colors"
                        >
                          <FileIcon className="h-4 w-4 flex-shrink-0" />
                          <span className="font-mono text-[10px] truncate max-w-[180px]">
                            {msg.fileName || 'Download File'}
                          </span>
                        </a>
                      )}
                    </div>
                  )}

                  <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.body}</p>

                  <div className="flex items-center justify-end space-x-1 mt-1 text-[8px] font-mono text-ink/60">
                    <span>{new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {mine && (
                      msg.read ? (
                        <CheckCheck className="h-3 w-3 text-ink" />
                      ) : (
                        <Check className="h-3 w-3 text-ink/40" />
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {otherUserTyping && (
          <div className="flex justify-start animate-pulse">
            <Badge variant="outline" className="flex items-center space-x-1.5 text-xs text-ink/60 bg-cream">
              <span className="w-1.5 h-1.5 bg-ink rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-ink rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-ink rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              <span className="font-mono text-[9px] font-bold uppercase pl-1">peer typing...</span>
            </Badge>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Connection error banner */}
      {connectionError && (
        <div className="bg-accent-coral/20 border-t-2 border-ink px-4 py-2 flex items-center justify-between text-xs text-ink font-mono">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-accent-coral flex-shrink-0" />
            <span>{connectionError}</span>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="flex-shrink-0 bg-cream border-t-2 border-ink px-4 py-3">
        <form onSubmit={handleSend} className="flex items-center space-x-3">
          {/* File selector input */}
          <input
            type="file"
            ref={chatFileRef}
            onChange={handleFileSelect}
            className="hidden"
            accept=".jpg,.jpeg,.png,.pdf"
          />

          <Button
            type="button"
            disabled={loadingFile || !!connectionError || !socket}
            onClick={() => chatFileRef.current?.click()}
            variant="outline"
            className="p-2.5 flex items-center justify-center flex-shrink-0"
          >
            {loadingFile ? (
              <Loader2 className="h-4 w-4 animate-spin text-accent-teal" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </Button>

          <Input
            value={input}
            onChange={handleInputChange}
            placeholder={connectionError ? "Connecting to chat..." : "Type a message…"}
            disabled={!!connectionError || !socket}
            className="flex-grow py-2.5"
          />
          <Button
            type="submit"
            disabled={!input.trim() || !!connectionError || !socket}
            variant="primary"
            className="p-2.5 flex items-center justify-center flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

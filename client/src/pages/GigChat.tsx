import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
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

const SOCKET_URL = 'http://localhost:3000';

export const GigChat: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gigTitle, setGigTitle] = useState('Gig Chat');
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);
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

  // Connect Socket.io
  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      socket.emit('join_room', id);
      socket.emit('get_online_users');
    });

    socket.on('online_users_list', (list: string[]) => {
      setOnlineUsers(list);
    });

    socket.on('user_status_changed', ({ userId, status }: { userId: string; status: 'online' | 'offline' }) => {
      setOnlineUsers(prev => {
        if (status === 'online') {
          if (prev.includes(userId)) return prev;
          return [...prev, userId];
        } else {
          return prev.filter(p => p !== userId);
        }
      });
    });

    socket.on('receive_message', (msg: Message) => {
      setMessages(prev => {
        if (prev.some(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on('user_typing', ({ userId }: { userId: string }) => {
      if (userId === otherUserId) {
        setOtherUserTyping(true);
      }
    });

    socket.on('user_stop_typing', ({ userId }: { userId: string }) => {
      if (userId === otherUserId) {
        setOtherUserTyping(false);
      }
    });

    socket.on('messages_read_receipt', ({ readerId }: { readerId: string }) => {
      if (readerId === otherUserId) {
        setMessages(prev =>
          prev.map(m => (m.senderId?._id === user?._id ? { ...m, read: true } : m))
        );
      }
    });

    socket.on('error', (err: string) => {
      setError(err);
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, [token, id, otherUserId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherUserTyping]);

  // Read receipts sender trigger
  useEffect(() => {
    if (socketRef.current && messages.length > 0) {
      socketRef.current.emit('read_messages', { gigId: id });
    }
  }, [messages, id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (socketRef.current) {
      socketRef.current.emit('typing', { gigId: id });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('stop_typing', { gigId: id });
      }, 2000);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socketRef.current) return;
    
    // Stop typing immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socketRef.current.emit('stop_typing', { gigId: id });
    
    socketRef.current.emit('send_message', { gigId: id, body: input.trim() });
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
      if (res.data.success && socketRef.current) {
        socketRef.current.emit('send_message', {
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

  const isImage = (filename?: string) => {
    if (!filename) return false;
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '');
  };

  return (
    <div className="flex flex-col flex-grow bg-cream animate-fade-in font-sans transition-colors duration-200" style={{ height: 'calc(100vh - 80px)' }}>

      {/* Header */}
      <div className="bg-cream border-b-2 border-ink px-4 py-3 flex items-center space-x-3 flex-shrink-0 text-left">
        <button onClick={() => navigate(`/gigs/${id}`)} className="text-ink/60 hover:text-ink cursor-pointer">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-grow flex items-center justify-between">
          <div>
            <h1 className="text-sm font-black font-display text-ink uppercase tracking-tight line-clamp-1">
              {gigTitle}
            </h1>
            <span className="text-[10px] font-mono text-accent-teal uppercase tracking-widest font-bold">
              Live Chat · End-to-end via Socket.io
            </span>
          </div>
          {otherUserId && (
            <Badge variant="outline" className="flex items-center space-x-1.5 bg-cream">
              <span className={`h-2.5 w-2.5 rounded-full border border-ink ${
                onlineUsers.includes(otherUserId) ? 'bg-accent-teal animate-pulse' : 'bg-ink/20'
              }`} />
              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-ink">
                {onlineUsers.includes(otherUserId) ? 'Online' : 'Offline'}
              </span>
            </Badge>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-grow overflow-y-auto px-4 py-4 space-y-3 bg-cream">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 text-accent-teal animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32 space-x-2 text-accent-coral text-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p className="text-xs text-ink/60 font-sans italic">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map(msg => {
            const mine = isMine(msg);
            return (
              <div key={msg._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] border-2 border-ink rounded-xl px-4 py-2.5 text-left relative shadow-retro-sm ${
                  mine
                    ? 'bg-accent-teal text-ink'
                    : 'bg-cream text-ink'
                }`}>
                  {!mine && (
                    <p className="text-[10px] font-bold font-display uppercase tracking-wider mb-0.5 text-ink/60">
                      {msg.senderId?.name}
                    </p>
                  )}
                  
                  {/* File preview block */}
                  {msg.fileUrl && (
                    <div className="mb-2">
                      {isImage(msg.fileName) ? (
                        <img 
                          src={`http://localhost:3000${msg.fileUrl}`} 
                          alt={msg.fileName} 
                          className="max-w-full rounded-lg border-2 border-ink p-0.5 max-h-48 object-contain bg-white"
                        />
                      ) : (
                        <a 
                          href={`http://localhost:3000${msg.fileUrl}`}
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className={`p-2 border-2 border-ink rounded-lg flex items-center space-x-2 text-xs font-bold ${
                            mine ? 'bg-cream/20 text-ink' : 'bg-cream/40 text-ink'
                          }`}
                        >
                          <FileIcon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate max-w-[150px]">{msg.fileName}</span>
                          {msg.fileSize && (
                            <span className="opacity-70 text-[9px] font-mono">
                              ({(msg.fileSize / 1024).toFixed(1)} KB)
                            </span>
                          )}
                        </a>
                      )}
                    </div>
                  )}

                  <p className="text-sm font-sans leading-relaxed">{msg.body}</p>
                  
                  <div className={`text-[9px] font-mono mt-1 text-right flex items-center justify-end space-x-1 ${mine ? 'text-ink/60' : 'text-ink/60'}`}>
                    <span>
                      {new Date(msg.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {mine && (
                      <span>
                        {msg.read ? (
                          <CheckCheck className="h-3 w-3 text-ink" />
                        ) : (
                          <Check className="h-3 w-3 text-ink/70" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Other User Typing Display */}
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
            disabled={loadingFile}
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
            placeholder="Type a message…"
            className="flex-grow py-2.5"
          />
          <Button
            type="submit"
            disabled={!input.trim()}
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

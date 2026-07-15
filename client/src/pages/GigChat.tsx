import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { ArrowLeft, Send, Loader2, AlertCircle } from 'lucide-react';

interface Message {
  _id: string;
  gigId: string;
  senderId: { _id: string; name: string; role: string };
  body: string;
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
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Load history from REST
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const [msgRes, gigRes] = await Promise.all([
          api.get(`/gigs/${id}/messages`),
          api.get(`/gigs/${id}`),
        ]);
        if (msgRes.data.success) setMessages(msgRes.data.messages);
        if (gigRes.data.success) setGigTitle(gigRes.data.gig.title);
      } catch {
        setError('Failed to load chat history. Make sure you are a participant.');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [id]);

  // Connect Socket.io
  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      socket.emit('join_room', id);
    });

    socket.on('receive_message', (msg: Message) => {
      setMessages(prev => {
        // Avoid duplicates if REST and socket overlap
        if (prev.some(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on('error', (err: string) => {
      setError(err);
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, [token, id]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socketRef.current) return;
    socketRef.current.emit('send_message', { gigId: id, body: input.trim() });
    setInput('');
  };

  const isMine = (msg: Message) => msg.senderId?._id === user?._id;

  return (
    <div className="flex flex-col flex-grow bg-paper animate-fade-in font-sans" style={{ height: 'calc(100vh - 80px)' }}>

      {/* Header */}
      <div className="bg-paper border-b-2 border-ink px-4 py-3 flex items-center space-x-3 flex-shrink-0">
        <button onClick={() => navigate(`/gigs/${id}`)} className="text-slate hover:text-ink">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-sm font-black font-display text-ink uppercase tracking-tight line-clamp-1">
            {gigTitle}
          </h1>
          <span className="text-[10px] font-mono text-route-teal uppercase tracking-widest font-bold">
            Live Chat · End-to-end via Socket.io
          </span>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-grow overflow-y-auto px-4 py-4 space-y-3 bg-paper">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 text-route-teal animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32 space-x-2 text-signal-coral text-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p className="text-xs text-slate font-sans italic">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map(msg => {
            const mine = isMine(msg);
            return (
              <div key={msg._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] border-2 border-ink sketch-border px-4 py-2.5 ${
                  mine
                    ? 'bg-route-teal text-white'
                    : 'bg-paper text-ink'
                }`}>
                  {!mine && (
                    <p className="text-[10px] font-bold font-display uppercase tracking-wider mb-0.5 text-slate">
                      {msg.senderId?.name}
                    </p>
                  )}
                  <p className="text-sm font-sans leading-relaxed">{msg.body}</p>
                  <p className={`text-[10px] font-mono mt-1 text-right ${mine ? 'text-white/60' : 'text-slate/60'}`}>
                    {new Date(msg.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 bg-paper border-t-2 border-ink px-4 py-3">
        <form onSubmit={handleSend} className="flex items-center space-x-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message…"
            className="flex-grow px-4 py-2.5 bg-paper border-2 border-ink sketch-input text-ink text-sm font-sans focus:outline-none focus:border-route-teal font-sans"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-2.5 bg-route-teal border-2 border-ink text-white sketch-button flex items-center justify-center flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

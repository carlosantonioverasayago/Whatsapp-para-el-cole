"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, User, Users, LogOut, MessageSquare } from 'lucide-react';

export default function ChatPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState<Set<any>>(new Set());
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase.from('messages').select('*').order('inserted_at', { ascending: true });
      if (data) {
        setMessages(data);
        setActiveUsers(new Set(data.map(m => m.user_id)));
      }
    };

    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    fetchMessages();
    getSession();

    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) console.error('Error logging in:', error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const { error } = await supabase.from('messages').insert([
      {
        content: newMessage,
        user_id: user.id,
        user_email: user.email,
      },
    ]);

    if (error) console.error('Error sending message:', error.message);
    setNewMessage('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">WhatsApp Cole</h1>
          <p className="text-gray-600 mb-8">Inicia sesión para empezar a chatear con tus compañeros.</p>
          <button
            onClick={handleLogin}
            className="flex items-center justify-center w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 gap-2"
          >
            <User className="w-5 h-5" />
            Entrar con Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#e5ddd5]">
      {/* Header */}
      <header className="bg-[#075e54] text-white p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Grupo del Colegio</h1>
            <p className="text-xs text-green-100">{activeUsers.size} miembros activos</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="hover:bg-white/10 p-2 rounded-full transition"
          title="Cerrar sesión"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => {
          const isMe = message.user_id === user.id;
          return (
            <div
              key={message.id}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 shadow-sm relative ${
                  isMe ? 'bg-[#dcf8c6] text-gray-800' : 'bg-white text-gray-800'
                }`}
              >
                {!isMe && (
                  <p className="text-[10px] font-bold text-blue-600 mb-1">
                    {message.user_email.split('@')[0]}
                  </p>
                )}
                <p className="text-sm">{message.content}</p>
                <p className="text-[10px] text-gray-500 text-right mt-1">
                  {new Date(message.inserted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} className="bg-[#f0f0f0] p-3 flex gap-2 items-center">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Escribe un mensaje aquí..."
          className="flex-1 bg-white border-none rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
        />
        <button
          type="submit"
          className="bg-[#075e54] hover:bg-[#128c7e] text-white p-2.5 rounded-full transition shadow-md disabled:opacity-50"
          disabled={!newMessage.trim()}
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}

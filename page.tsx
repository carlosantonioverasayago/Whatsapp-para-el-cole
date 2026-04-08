"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, LogOut } from 'lucide-react';

export default function ChatPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<any>(null);

  useEffect(() => {
    const getData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      const { data } = await supabase.from('messages').select('*').order('inserted_at', { ascending: true });
      if (data) setMessages(data);
      setLoading(false);
    };
    getData();

    const channel = supabase.channel('room1').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, 
      (payload: any) => { setMessages((current) => [...current, payload.new]); }
    ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (e: any) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    await supabase.from('messages').insert([{ content: newMessage, user_id: user.id, user_email: user.email }]);
    setNewMessage('');
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Cargando chat...</div>;

  if (!user) return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })} className="bg-green-600 text-white p-4 rounded-xl font-bold shadow-lg hover:bg-green-700 transition">
        Entrar al Chat con Google
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#e5ddd5]">
      <div className="bg-[#075e54] text-white p-4 flex justify-between items-center shadow-md">
        <span className="font-bold">WhatsApp Colegio</span>
        <button onClick={() => supabase.auth.signOut().then(() => setUser(null))} className="opacity-80 hover:opacity-100"><LogOut size={20}/></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((m: any) => (
          <div key={m.id} className={`flex ${m.user_id === user.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-2 rounded-lg max-w-[80%] shadow-sm ${m.user_id === user.id ? 'bg-[#dcf8c6]' : 'bg-white'}`}>
              <p className="text-[10px] font-bold text-blue-700 mb-1">{m.user_email?.split('@')[0]}</p>
              <p className="text-sm text-gray-800">{m.content}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="p-3 bg-[#f0f0f0] flex gap-2 border-t">
        <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="flex-1 border-none p-2 rounded-full px-4 text-sm outline-none shadow-inner" placeholder="Escribe un mensaje..." />
        <button type="submit" className="bg-[#075e54] text-white p-2 rounded-full px-4 hover:bg-[#128c7e] transition"><Send size={18}/></button>
      </form>
    </div>
  );
}

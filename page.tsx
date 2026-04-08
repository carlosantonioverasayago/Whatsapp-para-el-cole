"use client"
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bzgqluegvremheryxkqx.supabase.co"; 
const SUPABASE_KEY = "sb_publishable_u7IpNiA7Ii5WqX-S_AjGQQ_fzSt0xC_";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const AVATARES = ["🐶", "🐱", "🦊", "🦁", "🤖", "🦄", "🚀", "😎"];

export default function WhatsAppPro() {
const [activeUsers, setActiveUsers] = useState<Set<any>>(new Set());
  const [text, setText] = useState("");
  const [user, setUser] = useState({ name: "", avatar: "" });
  const [isRegistered, setIsRegistered] = useState(false);
  const [selectedChat, setSelectedChat] = useState("Global");
  const [activeUsers, setActiveUsers] = useState<Set<any>>(new Set());
  const scrollRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('chat_profile');
    if (saved) { setUser(JSON.parse(saved)); setIsRegistered(true); }

    const fetchMsgs = async () => {
      const { data } = await supabase.from('messages').select('*').order('inserted_at', { ascending: true });
      if (data) {
        setMessages(data);
        setActiveUsers(new Set(data.map(m => m.user_id)));
      }
    };
    fetchMsgs();

    const channel = supabase.channel('global').on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'messages' }, 
      (p) => {
        setMessages((prev) => [...prev, p.new]);
        setActiveUsers(prev => new Set(prev).add(p.new.user_id));
      }
    ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, selectedChat]);

  const enviar = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const content = text;
    setText("");
    await supabase.from('messages').insert([{ 
      content, user_id: user.name, avatar_url: user.avatar,
      receiver_id: selectedChat === "Global" ? null : selectedChat
    }]);
  };

  const logout = () => {
    localStorage.removeItem('chat_profile');
    setIsRegistered(false);
  };

  const filteredMessages = messages.filter(m => {
    if (selectedChat === "Global") return !m.receiver_id;
    return (m.user_id === user.name && m.receiver_id === selectedChat) || 
           (m.user_id === selectedChat && m.receiver_id === user.name);
  });

  // PANTALLA DE INICIO EN INGLÉS
  if (!isRegistered) {
    return (
      <div style={styles.setupBg}>
        <div style={styles.setupCard}>
          <h2 style={{ color: '#075e54', marginBottom: '10px' }}>Join the Chat</h2>
          <p style={{fontSize: '14px', color: '#666', marginBottom: '20px'}}>Please enter your details to start</p>
          <input 
            style={styles.setupInput} 
            placeholder="Your Username..." 
            value={user.name}
            onChange={e => setUser({...user, name: e.target.value})} 
          />
          <p style={{ margin: '15px 0 10px', fontWeight: 'bold' }}>Choose your Avatar:</p>
          <div style={styles.avatarGrid}>
            {AVATARES.map(a => (
              <div key={a} onClick={() => setUser({...user, avatar: a})} 
                   style={{...styles.avatarOption, background: user.avatar === a ? '#dcf8c6' : 'transparent', border: user.avatar === a ? '2px solid #25D366' : '1px solid #eee'}}>{a}</div>
            ))}
          </div>
          <button style={styles.setupBtn} onClick={() => { 
            if(user.name && user.avatar) {
              localStorage.setItem('chat_profile', JSON.stringify(user)); 
              setIsRegistered(true); 
            } else {
              alert("Please enter a name and pick an avatar");
            }
          }}>Get Started</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.appContainer}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>Chats</div>
        <div style={{...styles.userItem, background: selectedChat === "Global" ? '#f0f0f0' : 'transparent', fontWeight: 'bold'}} onClick={() => setSelectedChat("Global")}>🌍 Global Chat</div>
        <div style={styles.divider}>Contacts</div>
        {[...activeUsers].filter(u => u !== user.name).map(u => (
          <div key={u} style={{...styles.userItem, background: selectedChat === u ? '#f0f0f0' : 'transparent'}} onClick={() => setSelectedChat(u)}>👤 {u}</div>
        ))}
      </aside>

      <div style={styles.chatWrapper}>
        <header style={styles.header}>
          <div style={{display: 'flex', alignItems: 'center', flex: 1}}>
            <div style={styles.myAvatar}>{user.avatar}</div>
            <div style={{marginLeft: '10px'}}>
              <div style={{fontWeight: 'bold'}}>{selectedChat === "Global" ? "🌍 Global" : `🔒 ${selectedChat}`}</div>
              <div style={{fontSize: '11px', opacity: 0.9}}>Logged as: {user.name}</div>
            </div>
          </div>
          {/* BOTÓN PARA CAMBIAR NOMBRE / EDITAR */}
          <button onClick={logout} style={styles.editBtn} title="Change Name/Profile">⚙️ Edit Profile</button>
        </header>

        <main style={styles.chatArea}>
          {filteredMessages.map((m, i) => {
            const isMe = m.user_id === user.name;
            return (
              <div key={i} style={{...styles.msgWrapper, alignSelf: isMe ? 'flex-end' : 'flex-start'}}>
                <div style={{...styles.bubble, backgroundColor: isMe ? '#e7ffdb' : '#fff'}}>
                  {!isMe && <span style={styles.senderName}>{m.avatar_url} {m.user_id}</span>}
                  <p style={styles.msgText}>{m.content}</p>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </main>

        <footer style={styles.footer}>
          <form onSubmit={enviar} style={{display: 'flex', width: '100%', gap: '10px'}}>
            <input style={styles.input} value={text} onChange={e => setText(e.target.value)} placeholder="Type a message..." />
            <button style={styles.sendBtn}>➤</button>
          </form>
        </footer>
      </div>
    </div>
  );
}

const styles = {
  appContainer: { display: 'flex', height: '100vh', width: '100vw', fontFamily: 'sans-serif', overflow: 'hidden' },
  sidebar: { width: '280px', borderRight: '1px solid #ddd', background: '#fff', display: 'flex', flexDirection: 'column' },
  sidebarHeader: { padding: '20px', fontSize: '22px', fontWeight: 'bold', color: '#075e54', borderBottom: '1px solid #eee' },
  divider: { padding: '10px 20px', fontSize: '12px', color: '#999', background: '#fafafa', fontWeight: 'bold' },
  userItem: { padding: '15px 20px', cursor: 'pointer', borderBottom: '1px solid #f9f9f9' },
  chatWrapper: { flex: 1, display: 'flex', flexDirection: 'column', background: '#efe7dd' },
  header: { background: '#075e54', color: '#fff', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  myAvatar: { width: '38px', height: '38px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' },
  editBtn: { background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '5px 12px', borderRadius: '15px', cursor: 'pointer', fontSize: '12px' },
  chatArea: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' },
  msgWrapper: { marginBottom: '8px', maxWidth: '75%' },
  bubble: { padding: '8px 12px', borderRadius: '10px', boxShadow: '0 1px 1px rgba(0,0,0,0.1)' },
  senderName: { fontSize: '11px', fontWeight: 'bold', color: '#075e54', display: 'block', marginBottom: '2px' },
  msgText: { margin: '0', color: '#000000', fontSize: '15px' },
  footer: { padding: '10px 15px', background: '#f0f0f0' },
  input: { flex: 1, padding: '12px 18px', borderRadius: '25px', border: 'none', outline: 'none' },
  sendBtn: { background: '#075e54', color: '#fff', border: 'none', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer', fontSize: '18px' },
  setupBg: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#075e54' },
  setupCard: { background: '#fff', padding: '40px', borderRadius: '25px', textAlign: 'center', width: '320px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' },
  setupInput: { padding: '12px', width: '100%', marginBottom: '10px', borderRadius: '10px', border: '1px solid #ccc', boxSizing: 'border-box' },
  avatarGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' },
  avatarOption: { fontSize: '28px', cursor: 'pointer', padding: '8px', borderRadius: '10px', transition: '0.2s' },
  setupBtn: { background: '#25D366', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', width: '100%', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }
};

'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const */
import React, { useState, useRef, useEffect } from 'react';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'bot', content: string}[]>([
    { role: 'bot', content: 'Hello! I am MediBot, your AI Hospital Assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: userMessage })
      });

      if (!res.ok) throw new Error('API Error');

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'bot', content: data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', content: 'Sorry, I am having trouble connecting to the hospital network right now.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-indigo-600 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-indigo-700 transition-transform transform hover:scale-105"
      >
        <span className="text-2xl">{isOpen ? '▼' : '💬'}</span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col transition-all origin-bottom-right" style={{ height: '500px' }}>
          {/* Header */}
          <div className="bg-indigo-600 p-4 text-white">
            <h3 className="font-bold">MediBot</h3>
            <p className="text-xs text-indigo-200">Hospital AI Assistant</p>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white border border-slate-100 text-slate-700 shadow-sm rounded-bl-sm'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm rounded-bl-sm flex gap-1">
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-slate-100">
            <form onSubmit={handleSend} className="flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <button 
                type="submit" 
                disabled={loading || !input.trim()}
                className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

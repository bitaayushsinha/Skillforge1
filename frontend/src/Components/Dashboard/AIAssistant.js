import React, { useState, useRef, useEffect } from 'react';
import { GraduationCap, Send, User } from 'lucide-react';

// Simple markdown formatter to handle bold and basic code blocks
const formatMessage = (text) => {
  if (!text) return { __html: '' };
  let html = text
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-800 text-slate-200 p-3 rounded-xl overflow-x-auto my-2 text-sm font-mono border border-slate-700"><code>$1</code></pre>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-navy-900">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    .replace(/\n/g, '<br/>');
  return { __html: html };
};

const AIAssistant = ({ user }) => {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content: `Hi ${user?.name?.split(' ')[0] || 'there'}! I am the SkillForge Expert mentor. I can provide personalized course recommendations, explain complex concepts, or help you map out your learning journey. Ask me anything!`
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  const quickActions = [
    "Recommend a beginner Python course",
    "How do I transition to Data Science?",
    "Explain useLayoutEffect vs useEffect",
    "What are the prerequisites for Machine Learning?"
  ];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    const userMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sf_token')}`
        },
        body: JSON.stringify({
          messages: newMessages,
          context: "General Mentorship & Course Recommendations"
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages([...newMessages, { role: 'ai', content: data.response }]);
      } else {
        setMessages([...newMessages, { role: 'ai', content: "I'm having trouble connecting to my brain right now. Please try again later." }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages([...newMessages, { role: 'ai', content: "An error occurred while trying to reach the server. Make sure the backend is running!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative">
      
      {/* Header */}
      <div className="h-20 bg-white/90 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-navy-800 to-navy-900 text-white flex items-center justify-center shadow-md">
            <GraduationCap size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2">
              SkillForge Expert
            </h2>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Expert Mentor & Course Guide</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Online</span>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 no-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex items-end gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'ai' ? 'bg-navy text-white' : 'bg-coral text-white'}`}>
              {msg.role === 'ai' ? <GraduationCap size={20} /> : <User size={20} />}
            </div>
            
            <div 
              className={`p-4 shadow-sm text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-navy text-white rounded-2xl rounded-br-none max-w-[85%] md:max-w-[75%]' 
                  : 'bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-bl-none max-w-[85%] md:max-w-[75%]'
              }`}
              dangerouslySetInnerHTML={formatMessage(msg.content)}
            />
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-end gap-3">
            <div className="w-10 h-10 rounded-full bg-navy text-white flex items-center justify-center shrink-0 shadow-sm">
              <GraduationCap size={20} />
            </div>
            <div className="p-5 bg-white border border-slate-200 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1.5">
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} className="h-4" />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 p-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] shrink-0">
        <div className="max-w-4xl mx-auto">
          
          <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
            {quickActions.map((action, idx) => (
              <button 
                key={idx} 
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-full whitespace-nowrap transition-colors border border-slate-200 hover:border-slate-300 hover:text-navy-900"
                onClick={() => handleSendMessage(action)}
                disabled={isLoading}
              >
                {action}
              </button>
            ))}
          </div>
          
          <div className="relative flex items-center">
            <input 
              type="text"
              placeholder="Ask about courses, career paths, or coding concepts..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage(inputValue);
              }}
              disabled={isLoading}
              className="w-full pl-6 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 text-sm font-medium focus:bg-white focus:border-navy focus:ring-2 focus:ring-navy/20 transition-all outline-none shadow-inner"
            />
            <button 
              className="absolute right-2 w-10 h-10 bg-coral hover:bg-coral-hover text-white flex items-center justify-center rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-coral/20 hover:-translate-y-0.5"
              onClick={() => handleSendMessage(inputValue)}
              disabled={isLoading || !inputValue.trim()}
            >
              <Send size={18} />
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;

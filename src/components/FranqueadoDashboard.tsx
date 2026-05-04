import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Sparkles, User, Loader2, FileText, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function FranqueadoDashboard({ user, onBack }: any) {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailAuth, setEmailAuth] = useState(user || '');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (emailAuth) {
      fetchChatHistory();
    }
  }, [emailAuth]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChatHistory = async () => {
    try {
      const res = await fetch(`/api/chat/history?email=${encodeURIComponent(emailAuth)}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (e) {
      console.error("Failed to fetch history:", e);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading) return;
    
    const newMsg = { role: 'user', text: inputMessage.trim() };
    setMessages(prev => [...prev, newMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMsg.text, email: emailAuth })
      });
      const data = await res.json();
      
      if (data.success) {
        setMessages(prev => [...prev, { role: 'model', text: data.text }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', text: `Erro: ${data.error || 'Ocorreu um erro ao processar sua mensagem.'}` }]);
      }
    } catch (error: any) {
       console.error(error);
       setMessages(prev => [...prev, { role: 'model', text: `Falha de comunicação: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-4 md:p-8 w-full font-sans">
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)] bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 bg-white shadow-sm z-10">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shadow-inner">
                 <Sparkles className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div>
                 <h1 className="text-lg md:text-xl font-black text-gray-900 leading-tight">ÁREA DO FRANQUEADO</h1>
                 <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">Agente Especialista Botopremium</p>
              </div>
           </div>
           
           <button 
              onClick={onBack}
              className="p-2 md:px-4 md:py-2 rounded-xl text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors font-bold text-sm hidden md:flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <button 
              onClick={onBack}
              className="p-2 rounded-xl text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors md:hidden"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-gradient-to-b from-[#F8F9FA] to-white">
          {messages.length === 0 && !loading && (
             <div className="flex flex-col items-center justify-center h-full opacity-50 text-center px-4">
                <FileText className="w-16 h-16 md:w-24 md:h-24 text-gray-300 mb-6" />
                <h3 className="text-xl font-black text-gray-500 mb-2">Como posso ajudar?</h3>
                <p className="text-sm font-medium text-gray-400 max-w-md">Sou o agente especialista da Botopremium. Tire suas dúvidas sobre os manuais, processos e operações.</p>
             </div>
          )}

          {messages.map((msg, idx) => (
             <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                   
                   <div className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center ${msg.role === 'user' ? 'bg-amber-100 text-amber-700' : 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md'}`}>
                      {msg.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                   </div>
                   
                   <div className={`p-4 rounded-2xl text-sm md:text-base shadow-sm ${
                      msg.role === 'user' 
                         ? 'bg-amber-50 text-gray-800 border border-amber-100 rounded-tr-none' 
                         : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none markdown-body'
                   }`}>
                     {msg.role === 'model' ? (
                        <div className="prose prose-sm max-w-none text-gray-700">
                          <ReactMarkdown>
                            {msg.text}
                          </ReactMarkdown>
                        </div>
                     ) : (
                        msg.text
                     )}
                   </div>
                </div>
             </div>
          ))}
          {loading && (
             <div className="flex justify-start">
               <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 flex items-center gap-3">
                 <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                 <span className="text-sm text-gray-400 font-medium">Pensando...</span>
               </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-100">
           <div className="flex items-center gap-2 max-w-3xl mx-auto relative group">
              <input 
                type="text"
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="Pergunte sobre os manuais da Botopremium..."
                className="flex-1 bg-gray-50 border border-gray-200 text-gray-800 text-sm md:text-base rounded-2xl px-4 py-3 md:py-4 pr-12 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all group-hover:border-gray-300"
                disabled={loading || !emailAuth}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || loading || !emailAuth}
                className="absolute right-2 p-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:hover:bg-amber-500 text-white rounded-xl transition-colors shadow-md shadow-amber-500/20"
              >
                 <Send className="w-4 h-4 md:w-5 md:h-5 ml-0.5" />
              </button>
           </div>
           <p className="text-center text-[10px] text-gray-400 mt-3 font-medium uppercase tracking-widest">
             AI pode cometer erros. Verifique os manuais oficiais.
           </p>
        </div>

      </div>
    </div>
  );
}

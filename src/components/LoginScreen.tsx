import React, { useState } from 'react';
import { Loader2, LogIn, Terminal, Bug } from 'lucide-react';

export const LoginScreen = ({ onLogin }: { onLogin: (username: string) => void }) => {
    const [loginMode, setLoginMode] = useState<'admin' | 'franchisee'>('admin');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [error, setError] = useState('');
    const [redisData, setRedisData] = useState<any>(null);
    const [loadingRedis, setLoadingRedis] = useState(false);
    const [tokenData, setTokenData] = useState<any>(null);
    const [loadingToken, setLoadingToken] = useState(false);
    const [loadingAction, setLoadingAction] = useState(false);

    const handleSubmitAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingAction(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.success) {
                onLogin(data.user);
            } else {
                setError(data.error || 'Credenciais inválidas. Tente novamente.');
            }
        } catch (err) {
            setError('Erro de comunicação com o servidor.');
        } finally {
            setLoadingAction(false);
        }
    };

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingAction(true);
        try {
            const res = await fetch('/api/auth/send-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (data.success) {
                setCodeSent(true);
                setError('');
            } else {
                setError(data.error || 'Falha ao enviar código.');
            }
        } catch (err) {
            setError('Erro de comunicação. Tente novamente.');
        } finally {
            setLoadingAction(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingAction(true);
        try {
            const res = await fetch('/api/auth/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });
            const data = await res.json();
            if (data.success) {
                onLogin(email.toLowerCase());
            } else {
                setError(data.error || 'Código inválido.');
            }
        } catch (err) {
            setError('Erro de comunicação. Tente novamente.');
        } finally {
            setLoadingAction(false);
        }
    };

    const fetchRedisData = async () => {
        setLoadingRedis(true);
        try {
            const res = await fetch('/api/debug/redis');
            const data = await res.json();
            setRedisData(data);
        } catch (err: any) {
            setRedisData({ error: err.message });
        } finally {
            setLoadingRedis(false);
        }
    };

    const fetchTokenData = async () => {
        setLoadingToken(true);
        try {
            const res = await fetch('/api/debug/check-token');
            const data = await res.json();
            setTokenData(data);
        } catch (err: any) {
            setTokenData({ error: err.message });
        } finally {
            setLoadingToken(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFBF7] bg-watermark flex flex-col items-center justify-center p-4 selection:bg-[#E3C78B]/30 selection:text-[#4A423D] font-sans">
            <div className="bg-white/80 backdrop-blur-md p-8 md:p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/50 w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-4 duration-700 mb-8 relative overflow-hidden">
                <div className="flex flex-col items-center mb-8 relative z-10">
                    <div className="w-20 h-20 mb-6 flex items-center justify-center">
                        <img src="https://caase.com.br/uploads/agreements/filename/image_7376bc2cbd1d570e.png" alt="Logo" className="w-full h-full object-contain drop-shadow-md" referrerPolicy="no-referrer" />
                    </div>
                    <h1 className="text-[11px] font-display font-medium tracking-[0.3em] text-[#4A423D] text-center uppercase leading-tight">Painel de Controle Estratégico</h1>
                </div>

                <div className="flex gap-2 mb-8 p-1.5 bg-[#F9F8F6] rounded-xl relative z-10">
                    <button 
                        onClick={() => { setLoginMode('admin'); setError(''); setCodeSent(false); }}
                        className={`flex-1 py-2.5 text-[13px] font-medium rounded-lg transition-all duration-300 ${loginMode === 'admin' ? 'bg-white text-[#C19A5B] shadow-[0_2px_10px_rgb(0,0,0,0.02)] ring-1 ring-black/5 font-semibold' : 'text-[#8A827D] hover:text-[#4A423D]'}`}
                    >
                        Equipe Interna
                    </button>
                    <button 
                        onClick={() => { setLoginMode('franchisee'); setError(''); }}
                        className={`flex-1 py-2.5 text-[13px] font-medium rounded-lg transition-all duration-300 ${loginMode === 'franchisee' ? 'bg-white text-[#C19A5B] shadow-[0_2px_10px_rgb(0,0,0,0.02)] ring-1 ring-black/5 font-semibold' : 'text-[#8A827D] hover:text-[#4A423D]'}`}
                    >
                        Franqueado
                    </button>
                </div>

                {loginMode === 'admin' ? (
                    <form onSubmit={handleSubmitAdmin} className="space-y-6 relative z-10">
                        <div>
                            <label className="block text-[13px] text-[#8A827D] mb-1.5 ml-1">Usuário</label>
                            <input 
                                type="text" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-[#FDFBF7] text-[#4A423D] font-medium border-b border-gray-200 focus:border-[#C19A5B] block p-3 outline-none transition-colors rounded-t-xl"
                                placeholder="Seu usuário"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[13px] text-[#8A827D] mb-1.5 ml-1">Senha</label>
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#FDFBF7] text-[#4A423D] font-medium border-b border-gray-200 focus:border-[#C19A5B] block p-3 outline-none transition-colors rounded-t-xl"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        
                        {error && <p className="text-sm text-red-500 font-medium text-center">{error}</p>}

                        <button 
                            type="submit" 
                            className="w-full bg-gradient-to-r from-[#C19A5B] to-[#E3C78B] hover:opacity-90 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-[#C19A5B]/30 transition-all flex items-center justify-center gap-2 mt-6 active:scale-[0.98]"
                        >
                            Entrar <LogIn className="w-4 h-4 ml-1" />
                        </button>
                    </form>
                ) : (
                    <form onSubmit={codeSent ? handleVerifyCode : handleSendCode} className="space-y-6 relative z-10">
                        <div>
                            <label className="block text-[13px] text-[#8A827D] mb-1.5 ml-1">Email do Franqueado</label>
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={codeSent || loadingAction}
                                className="w-full bg-[#FDFBF7] text-[#4A423D] font-medium border-b border-gray-200 focus:border-[#C19A5B] block p-3 outline-none transition-colors rounded-t-xl disabled:opacity-50"
                                placeholder="franqueado@botopremium.com.br"
                                required
                            />
                        </div>
                        
                        {codeSent && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300 mt-6">
                                <label className="block text-[13px] text-[#8A827D] mb-1.5 ml-1 flex justify-between">
                                    <span>Código de Verificação</span>
                                    <span className="text-[11px] text-[#C19A5B]">Verifique seu email</span>
                                </label>
                                <input 
                                    type="text" 
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    disabled={loadingAction}
                                    className="w-full bg-[#FDFBF7] text-[#4A423D] font-medium border-b border-[#C19A5B] focus:bg-white block p-3 outline-none transition-colors rounded-t-xl text-center tracking-[0.3em]"
                                    placeholder="000000"
                                    maxLength={6}
                                    required
                                />
                            </div>
                        )}
                        
                        {error && <p className="text-sm text-red-500 font-medium text-center">{error}</p>}

                        <button 
                            type="submit" 
                            disabled={loadingAction}
                            className="w-full bg-gradient-to-r from-[#C19A5B] to-[#E3C78B] hover:opacity-90 disabled:opacity-70 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-[#C19A5B]/30 transition-all flex items-center justify-center gap-2 mt-6 active:scale-[0.98]"
                        >
                            {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4 ml-1" />} 
                            {codeSent ? 'Verificar e Entrar' : 'Receber Código'}
                        </button>
                        
                        {codeSent && (
                           <button type="button" onClick={() => setCodeSent(false)} className="w-full text-[13px] font-medium text-[#C19A5B] hover:text-[#AA7C11] mt-4 text-center transition-colors" disabled={loadingAction}>
                             Voltar ao email
                           </button>
                        )}
                    </form>
                )}
            </div>

            {/* Debug Redis Button - Só aparece se o usuário for "bruno" */}
            {username.toLowerCase() === 'bruno' && (
                <div className="w-full max-w-2xl bg-white p-6 rounded-3xl shadow-xl border border-gray-100 animate-in fade-in duration-500 space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><Terminal className="w-5 h-5 text-amber-600"/> Debug Tokens (Provisório)</h3>
                        <div className="flex gap-2">
                            <button 
                                onClick={fetchTokenData}
                                disabled={loadingToken}
                                className="bg-amber-100 hover:bg-amber-200 text-amber-800 px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
                            >
                                {loadingToken ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bug className="w-4 h-4" />}
                                Ver Token Atual
                            </button>
                            <button 
                                onClick={fetchRedisData}
                                disabled={loadingRedis}
                                className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
                            >
                                {loadingRedis ? <Loader2 className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
                                Ver Redis Completo
                            </button>
                        </div>
                    </div>
                    
                    {tokenData && (
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                            <h4 className="text-xs font-bold text-amber-800 mb-2 uppercase tracking-wider">Status do Token Lido pelo Backend:</h4>
                            <pre className="text-amber-900 text-xs font-mono whitespace-pre-wrap">
                                {JSON.stringify(tokenData, null, 2)}
                            </pre>
                        </div>
                    )}

                    {redisData && (
                        <div className="bg-gray-900 p-4 rounded-xl overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                            <pre className="text-green-400 text-xs font-mono">
                                {JSON.stringify(redisData, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

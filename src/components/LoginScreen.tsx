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
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-4 selection:bg-amber-100 selection:text-amber-900">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-600/30 border border-amber-400/50 mb-4 overflow-hidden">
                        <img src="https://caase.com.br/uploads/agreements/filename/image_7376bc2cbd1d570e.png" alt="Logo" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-gray-900 text-center uppercase leading-tight">Painel de Controle Estratégico</h1>
                </div>

                <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
                    <button 
                        onClick={() => { setLoginMode('admin'); setError(''); setCodeSent(false); }}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${loginMode === 'admin' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Equipe Interna
                    </button>
                    <button 
                        onClick={() => { setLoginMode('franchisee'); setError(''); }}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${loginMode === 'franchisee' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Franqueado
                    </button>
                </div>

                {loginMode === 'admin' ? (
                    <form onSubmit={handleSubmitAdmin} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Usuário</label>
                            <input 
                                type="text" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 text-gray-800 font-medium rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 block p-3 outline-none transition-all"
                                placeholder="admin"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Senha</label>
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 text-gray-800 font-medium rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 block p-3 outline-none transition-all"
                                placeholder="••••••"
                                required
                            />
                        </div>
                        
                        {error && <p className="text-sm text-red-500 font-bold text-center">{error}</p>}

                        <button 
                            type="submit" 
                            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 mt-4"
                        >
                            <LogIn className="w-5 h-5" /> Entrar no Dashboard
                        </button>
                    </form>
                ) : (
                    <form onSubmit={codeSent ? handleVerifyCode : handleSendCode} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email do Franqueado</label>
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={codeSent || loadingAction}
                                className="w-full bg-gray-50 border border-gray-200 text-gray-800 font-medium rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 block p-3 outline-none transition-all disabled:opacity-50"
                                placeholder="franqueado@botopremium.com.br"
                                required
                            />
                        </div>
                        
                        {codeSent && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Código de Verificação <span className="text-xs text-amber-500 font-normal lowercase">(enviado ao seu email)</span></label>
                                <input 
                                    type="text" 
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    disabled={loadingAction}
                                    className="w-full bg-amber-50 border border-amber-200 text-amber-900 font-bold tracking-[0.2em] text-center rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 block p-3 outline-none transition-all"
                                    placeholder="000000"
                                    maxLength={6}
                                    required
                                />
                            </div>
                        )}
                        
                        {error && <p className="text-sm text-red-500 font-bold text-center">{error}</p>}

                        <button 
                            type="submit" 
                            disabled={loadingAction}
                            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70"
                        >
                            {loadingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />} 
                            {codeSent ? 'Verificar e Entrar' : 'Receber Código'}
                        </button>
                        
                        {codeSent && (
                           <button type="button" onClick={() => setCodeSent(false)} className="w-full text-sm font-bold text-amber-600 hover:text-amber-700 mt-2 text-center" disabled={loadingAction}>
                             Alterar email
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

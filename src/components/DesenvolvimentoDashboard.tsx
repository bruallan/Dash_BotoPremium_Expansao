import React, { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus, Settings, Save, Trash2, CheckCircle, Bot, FileText, Upload, X, Loader2 } from 'lucide-react';

const DesenvolvimentoDashboard = ({ user, profiles, setProfiles, onBack }: any) => {
    const [activeTab, setActiveTab] = useState('Conf. Agente IA');
    const [newUsername, setNewUsername] = useState('');
    const [savedId, setSavedId] = useState<string | null>(null);

    const [agentConfig, setAgentConfig] = useState<any>({ systemInstruction: '', manuals: [] });
    const [agentLoading, setAgentLoading] = useState(true);
    const [savingAgent, setSavingAgent] = useState(false);
    const [uploadingManual, setUploadingManual] = useState(false);

    useEffect(() => {
        if (activeTab === 'Conf. Agente IA') {
            fetchAgentConfig();
        }
    }, [activeTab]);

    const fetchAgentConfig = async () => {
        try {
            setAgentLoading(true);
            const res = await fetch('/api/agent/config');
            const data = await res.json();
            setAgentConfig(data);
        } catch (e) {
            console.error("Error fetching agent config:", e);
        } finally {
            setAgentLoading(false);
        }
    };

    const handleSaveAgentConfig = async () => {
        try {
           setSavingAgent(true);
           await fetch('/api/agent/config', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify(agentConfig)
           });
           // show success
           setSavedId('agent');
           setTimeout(() => setSavedId(null), 2000);
        } catch (e) {
           console.error("Error saving agent config:", e);
        } finally {
           setSavingAgent(false);
        }
    };

    const handleUploadManual = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadingManual(true);
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64Data = event.target?.result;
                const res = await fetch('/api/agent/upload-manual', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: file.name, base64Data })
                });
                const data = await res.json();
                if (data.success) {
                    const newManuals = [...(agentConfig.manuals || []), { name: data.name, url: data.url, path: data.path }];
                    setAgentConfig({ ...agentConfig, manuals: newManuals });
                    
                    // auto save config
                    await fetch('/api/agent/config', {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({ ...agentConfig, manuals: newManuals })
                    });
                } else {
                    alert(data.error);
                }
                setUploadingManual(false);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error(err);
            setUploadingManual(false);
        }
    };

    const handleDeleteManual = async (manualPath: string) => {
        if (!window.confirm("Deseja realmente remover este manual?")) return;
        try {
            setAgentLoading(true);
            await fetch('/api/agent/delete-manual', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ path: manualPath })
            });

            const newManuals = agentConfig.manuals.filter((m: any) => m.path !== manualPath);
            setAgentConfig({ ...agentConfig, manuals: newManuals });
            
            // auto save config
            await fetch('/api/agent/config', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ ...agentConfig, manuals: newManuals })
            });
        } catch (e) {
            console.error(e);
        } finally {
            setAgentLoading(false);
        }
    };

    const availableSectors = ['financeiro', 'operacoes', 'regionais', 'expansao', 'rh', 'desenvolvimento'];

    const handleToggleSector = (username: string, sector: string) => {
        setProfiles(profiles.map((p: any) => {
            if (p.username === username) {
                const hasSector = p.sectors.includes(sector);
                const newSectors = hasSector 
                    ? p.sectors.filter((s: string) => s !== sector)
                    : [...p.sectors, sector];
                return { ...p, sectors: newSectors };
            }
            return p;
        }));
        setSavedId(username);
        setTimeout(() => setSavedId(null), 2000);
    };

    const handleAddProfile = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newUsername.trim().toLowerCase();
        if (!trimmed) return;
        if (profiles.some((p: any) => p.username === trimmed)) return; // already exists
        
        setProfiles([...profiles, { username: trimmed, sectors: [] }]);
        setNewUsername('');
    };

    const handleDeleteProfile = (username: string) => {
        if (username === 'bruno') return; // root
        setProfiles(profiles.filter((p: any) => p.username !== username));
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-gray-800 font-sans p-4 md:p-8 w-full selection:bg-amber-100 selection:text-amber-900">
            <div className="max-w-[1600px] mx-auto w-full">
            {/* Header */}
            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
                <div className="flex items-center gap-4 w-full xl:w-auto">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-amber-600/30 border border-amber-400/50 overflow-hidden shrink-0">
                        <img src="https://caase.com.br/uploads/agreements/filename/image_7376bc2cbd1d570e.png" alt="Logo" className="w-full h-full object-contain p-1.5" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-gray-900 leading-none mb-1">DESENVOLVIMENTO</h1>
                        <p className="text-[10px] text-amber-600 font-extrabold uppercase tracking-[0.2em] leading-none">Painel de Controle Estratégico</p>
                    </div>
                </div>
                
                <div className="w-full xl:w-auto mt-4 xl:mt-0">
                    <div className="flex flex-wrap items-center justify-start xl:justify-end gap-4 md:gap-6">
                        <button
                            onClick={() => setActiveTab('Conf. Agente IA')}
                            className={`flex items-center gap-2 text-sm font-bold transition-all duration-300 ${
                                activeTab === 'Conf. Agente IA' 
                                    ? 'bg-gradient-to-r from-amber-500 to-amber-550 text-white px-6 py-2.5 rounded-2xl shadow-md shadow-amber-500/30' 
                                    : 'text-gray-500 hover:text-amber-600'
                            }`}
                        >
                            <Bot className="w-4 h-4 shrink-0" />
                            <span>Agente de IA</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('Perfis de Acesso')}
                            className={`flex items-center gap-2 text-sm font-bold transition-all duration-300 ${
                                activeTab === 'Perfis de Acesso' 
                                    ? 'bg-gradient-to-r from-amber-500 to-amber-550 text-white px-6 py-2.5 rounded-2xl shadow-md shadow-amber-500/30' 
                                    : 'text-gray-500 hover:text-amber-600'
                            }`}
                        >
                            <Settings className="w-4 h-4 shrink-0" />
                            <span>Perfis de Acesso</span>
                        </button>
                        <button 
                            onClick={onBack}
                            className="flex items-center justify-center gap-2 text-sm font-bold text-gray-400 hover:text-amber-600 transition-all duration-300 shrink-0 ml-2"
                            title="Voltar aos Setores"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            <div className="animate-in fade-in duration-500">
                {activeTab === 'Perfis de Acesso' && (
                    <div className="bg-white p-6 md:p-8 border border-gray-200 rounded-2xl shadow-sm">
                        <h2 className="text-2xl font-black text-gray-800 mb-6">Controle de Perfis</h2>
                        
                        <form onSubmit={handleAddProfile} className="flex gap-2 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <input 
                                type="text"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                placeholder="Novo usuário..."
                                className="bg-white border border-gray-200 text-gray-800 font-medium rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 w-64"
                            />
                            <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                                <UserPlus className="w-4 h-4" /> Adicionar
                            </button>
                        </form>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-400 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 font-bold rounded-tl-lg">Usuário</th>
                                        <th className="px-4 py-3 font-bold">Acessos Permitidos</th>
                                        <th className="px-4 py-3 font-bold text-center rounded-tr-lg">Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {profiles.map((p: any) => (
                                        <tr key={p.username} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-4 font-bold text-gray-700">
                                                {p.username}
                                                {savedId === p.username && <span className="ml-2 text-xs text-green-500 font-semibold inline-flex items-center gap-1 animate-pulse"><CheckCircle className="w-3 h-3" /> Salvo</span>}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-wrap gap-3">
                                                    {availableSectors.map(sector => (
                                                        <label key={sector} className="flex items-center gap-2 cursor-pointer group">
                                                            <div className="relative flex items-center">
                                                                <input 
                                                                    type="checkbox"
                                                                    checked={p.sectors.includes(sector)}
                                                                    onChange={() => handleToggleSector(p.username, sector)}
                                                                    className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500 transition-colors cursor-pointer"
                                                                />
                                                            </div>
                                                            <span className="text-xs font-semibold text-gray-600 uppercase group-hover:text-amber-700 transition-colors">{sector}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {p.username !== 'bruno' && (
                                                    <button onClick={() => handleDeleteProfile(p.username)} className="text-gray-400 hover:text-red-500 transition-colors p-2" title="Excluir">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'Conf. Agente IA' && (
                    <div className="bg-white p-6 md:p-8 border border-gray-200 rounded-2xl shadow-sm">
                        {agentLoading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-4" />
                                <p className="text-gray-500 font-bold">Carregando configurações do agente...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col xl:flex-row gap-8">
                                <div className="flex-1 space-y-6">
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-800 mb-2">Instruções do Agente IA</h2>
                                        <p className="text-sm text-gray-500 mb-4">Essas instruções definem o papel, o tom de voz e como o agente deve responder aos franqueados.</p>
                                        <textarea 
                                            value={agentConfig.systemInstruction}
                                            onChange={(e) => setAgentConfig({ ...agentConfig, systemInstruction: e.target.value })}
                                            rows={14}
                                            className="w-full bg-gray-50 border border-gray-200 text-gray-800 font-medium rounded-xl p-4 outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 resize-y"
                                            placeholder="Digite as instruções customizadas..."
                                        />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button 
                                            onClick={handleSaveAgentConfig}
                                            disabled={savingAgent}
                                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-3 rounded-xl transition-colors flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {savingAgent ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                            {savingAgent ? 'Salvando...' : 'Salvar Alterações'}
                                        </button>
                                        {savedId === 'agent' && <span className="text-sm text-green-500 font-semibold inline-flex items-center gap-1 animate-pulse"><CheckCircle className="w-4 h-4" /> Configuração salva!</span>}
                                    </div>
                                </div>
                                <div className="xl:w-1/3 space-y-6">
                                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                        <h3 className="text-lg font-black text-gray-800 mb-1 flex items-center gap-2">
                                            <FileText className="w-5 h-5 text-amber-500" />
                                            Manuais Complementares
                                        </h3>
                                        <p className="text-sm text-gray-500 mb-6">Faça o upload de manuais em PDF. O agente usará estes materiais como base de resposta.</p>
                                        
                                        <div className="space-y-3 mb-6 max-h-64 overflow-y-auto pr-2">
                                            {(!agentConfig.manuals || agentConfig.manuals.length === 0) && (
                                                <div className="text-center p-6 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                                                    <p className="text-sm text-gray-400">Nenhum manual cadastrado.</p>
                                                </div>
                                            )}
                                            {agentConfig.manuals?.map((manual: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="bg-amber-100 text-amber-600 p-2 rounded-lg">
                                                            <FileText className="w-4 h-4" />
                                                        </div>
                                                        <a href={manual.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-gray-700 hover:text-amber-600 truncate max-w-[150px]">
                                                            {manual.name}
                                                        </a>
                                                    </div>
                                                    <button onClick={() => handleDeleteManual(manual.path)} className="text-gray-400 hover:text-red-500 transition-colors p-2" title="Remover Manual">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="relative">
                                            <input 
                                                type="file" 
                                                accept=".pdf"
                                                id="manualUpload"
                                                onChange={handleUploadManual}
                                                disabled={uploadingManual}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                            />
                                            <div className={`w-full flex items-center justify-center gap-2 border-2 border-dashed border-amber-300 bg-amber-50 rounded-xl p-4 transition-colors ${uploadingManual ? 'opacity-50' : 'hover:bg-amber-100 hover:border-amber-400'}`}>
                                                {uploadingManual ? <Loader2 className="w-5 h-5 text-amber-600 animate-spin" /> : <Upload className="w-5 h-5 text-amber-600" />}
                                                <span className="font-bold text-amber-700">{uploadingManual ? 'Enviando...' : 'Fazer Upload de PDF'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            </div>
        </div>
    );
};

export default DesenvolvimentoDashboard;

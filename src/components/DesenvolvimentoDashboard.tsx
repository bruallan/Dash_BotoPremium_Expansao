import React, { useState } from 'react';
import { ArrowLeft, UserPlus, Settings, Save, Trash2, CheckCircle } from 'lucide-react';

const DesenvolvimentoDashboard = ({ user, profiles, setProfiles, onBack }: any) => {
    const [activeTab, setActiveTab] = useState('Perfis de Acesso');
    const [newUsername, setNewUsername] = useState('');
    const [savedId, setSavedId] = useState<string | null>(null);

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
            </div>
            </div>
        </div>
    );
};

export default DesenvolvimentoDashboard;

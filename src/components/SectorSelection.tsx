import React from 'react';
import { User, LogOut, HelpCircle } from 'lucide-react';

export const SectorSelection = ({ user, profiles, onSelectSector, onLogout }: any) => {
    // Definir acessos
    const getAllowedSectors = (u: string) => {
        const username = u.toLowerCase();
        const profile = profiles?.find((p: any) => p.username.toLowerCase() === username);
        let s = profile ? profile.sectors : [username];
        
        if (['bruno', 'admin', 'operacoes'].includes(username) && !s.includes('franqueado')) {
            s = [...s, 'franqueado'];
        }
        
        return s;
    };

    const allowedSectors = getAllowedSectors(user);

    const sectors = [
        { id: 'financeiro', name: 'FINANCEIRO' },
        { id: 'operacoes', name: 'OPERAÇÕES' },
        { id: 'regionais', name: 'REGIONAIS' },
        { id: 'expansao', name: 'EXPANSÃO' },
        { id: 'rh', name: 'RH' },
        { id: 'desenvolvimento', name: 'DESENVOLVIMENTO' },
        { id: 'franqueado', name: 'ÁREA DO FRANQUEADO' },
        { id: 'empty3', name: '' },
        { id: 'empty4', name: '' },
    ];

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-4 selection:bg-amber-100 selection:text-amber-900 relative">
            
            {/* Header Menu */}
            <div className="absolute top-4 md:top-8 right-4 md:right-8 flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-gray-100">
                    <User className="w-5 h-5 text-amber-500" />
                    <span className="text-sm font-black text-gray-700 capitalize tracking-wide">{user}</span>
                </div>
                <button className="bg-white p-2.5 rounded-2xl text-gray-400 border border-gray-100 shadow-sm transition-colors opacity-50 cursor-not-allowed">
                    <HelpCircle className="w-5 h-5" />
                </button>
                <button 
                    onClick={onLogout}
                    className="bg-white p-2.5 rounded-2xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm border border-gray-100 group"
                    title="Sair"
                >
                    <LogOut className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                </button>
            </div>

            <div className="w-full max-w-4xl text-center mb-12 flex flex-col items-center mt-16 md:mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-lg shadow-amber-600/30 border border-amber-400/50 mb-6 overflow-hidden">
                    <img src="https://caase.com.br/uploads/agreements/filename/image_7376bc2cbd1d570e.png" alt="Logo" className="w-full h-full object-contain p-3" referrerPolicy="no-referrer" />
                </div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight text-gray-900 mb-2">SELECIONE O SETOR</h1>
                <p className="text-xs md:text-sm font-extrabold text-amber-600 uppercase tracking-[0.2em]">Painel de Controle Estratégico</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-8 duration-700">
                {sectors.map((sector) => {
                    const isAvailable = sector.name && allowedSectors.includes(sector.id);
                    
                    if (!sector.name) {
                        return (
                            <div key={sector.id} className="bg-gray-400/80 rounded-3xl h-28 md:h-40 w-full shadow-inner opacity-80"></div>
                        );
                    }

                    if (!isAvailable) {
                        return (
                            <div key={sector.id} className="bg-gray-400/80 rounded-3xl h-28 md:h-40 w-full flex items-center justify-center shadow-inner opacity-80 cursor-not-allowed">
                                <span className="font-black text-lg md:text-2xl text-white tracking-widest">{sector.name}</span>
                            </div>
                        );
                    }

                    return (
                        <button
                            key={sector.id}
                            onClick={() => onSelectSector(sector.id)}
                            className="bg-amber-400 hover:bg-amber-500 hover:scale-[1.02] active:scale-95 shadow-xl shadow-amber-400/30 rounded-3xl h-28 md:h-40 w-full flex items-center justify-center transition-all duration-300 group"
                        >
                            <span className="font-black text-lg md:text-2xl text-white tracking-widest group-hover:drop-shadow-md transition-all">{sector.name}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    );
};

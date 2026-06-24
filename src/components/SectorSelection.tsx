import React from 'react';
import { User, LogOut, HelpCircle, LineChart, Settings2, Globe, TrendingUp, Users, Code, Store, Lock, Database } from 'lucide-react';

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
        { id: 'financeiro', name: 'FINANCEIRO', icon: LineChart },
        { id: 'operacoes', name: 'OPERAÇÕES', icon: Settings2 },
        { id: 'regionais', name: 'REGIONAIS', icon: Globe },
        { id: 'expansao', name: 'EXPANSÃO', icon: TrendingUp },
        { id: 'rh', name: '', icon: null },
        { id: 'desenvolvimento', name: 'DESENVOLVIMENTO', icon: Code },
        { id: 'franqueado', name: 'ÁREA DO FRANQUEADO', icon: Store },
        { id: 'bdfirebase', name: 'BD FIREBASE', icon: Database },
        { id: 'empty4', name: '', icon: null },
    ];

    const getInitial = (name: string) => name ? name.charAt(0).toUpperCase() : '?';

    return (
        <div className="min-h-screen bg-[#FDFBF7] bg-watermark flex flex-col items-center justify-center p-4 md:p-8 selection:bg-[#E3C78B]/30 selection:text-[#4A423D] font-sans relative">
            
            {/* Header Menu */}
            <div className="absolute top-4 right-4 md:top-8 md:right-8 flex items-center gap-3">
                <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md px-3 py-2 rounded-full shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-transparent hover:bg-white transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#C19A5B] to-[#E3C78B] flex items-center justify-center text-white font-semibold text-sm shadow-inner">
                        {getInitial(user)}
                    </div>
                    <span className="text-[13px] font-semibold text-[#4A423D] capitalize tracking-wide pr-2">{user}</span>
                </div>
                <button className="bg-white/60 backdrop-blur-md p-2.5 rounded-full text-[#8A827D] hover:bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-colors opacity-50 cursor-not-allowed">
                    <HelpCircle className="w-5 h-5" strokeWidth={1.5} />
                </button>
                <button 
                    onClick={onLogout}
                    className="bg-white/60 backdrop-blur-md p-2.5 rounded-full text-[#8A827D] hover:text-[#C19A5B] hover:bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-colors group"
                    title="Sair"
                >
                    <LogOut className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" strokeWidth={1.5} />
                </button>
            </div>

            <div className="w-full max-w-4xl text-center mb-12 flex flex-col items-center mt-16 md:mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-6 overflow-hidden">
                    <img src="https://caase.com.br/uploads/agreements/filename/image_7376bc2cbd1d570e.png" alt="Logo" className="w-full h-full object-contain p-2 drop-shadow-md" referrerPolicy="no-referrer" />
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-medium tracking-[0.05em] text-[#4A423D] mb-3">Selecione o Setor</h1>
                <p className="text-[11px] md:text-[12px] font-medium text-[#C19A5B] uppercase tracking-[0.3em]">Painel de Controle Estratégico</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700">
                {sectors.map((sector) => {
                    const isAvailable = sector.name && allowedSectors.includes(sector.id);
                    const Icon = sector.icon;
                    
                    if (!sector.name) {
                        return (
                            <div key={sector.id} className="rounded-2xl h-32 md:h-40 w-full border border-dashed border-[#C19A5B]/20 bg-transparent opacity-50"></div>
                        );
                    }

                    if (!isAvailable) {
                        return (
                            <div key={sector.id} className="rounded-2xl h-32 md:h-40 w-full flex flex-col items-center justify-center bg-white/40 border border-dashed border-gray-200 opacity-60 cursor-not-allowed">
                                <Lock className="w-6 h-6 text-gray-400 mb-3" strokeWidth={1.5} />
                                <span className="font-display font-medium text-[11px] md:text-[13px] text-gray-500 tracking-[0.1em] uppercase text-center px-2">{sector.name}</span>
                            </div>
                        );
                    }

                    return (
                        <button
                            key={sector.id}
                            onClick={() => onSelectSector(sector.id)}
                            className="bg-white hover:bg-[#FDFBF7] shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(193,154,91,0.12)] border border-transparent hover:border-[#C19A5B]/30 rounded-2xl h-32 md:h-40 w-full flex flex-col items-center justify-center transition-all duration-300 group hover:-translate-y-1"
                        >
                            {Icon && <Icon className="w-8 h-8 text-[#C19A5B] mb-3 group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />}
                            <span className="font-display font-medium text-[11px] md:text-[13px] text-[#4A423D] tracking-[0.1em] uppercase group-hover:text-[#C19A5B] transition-colors">{sector.name}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    );
};

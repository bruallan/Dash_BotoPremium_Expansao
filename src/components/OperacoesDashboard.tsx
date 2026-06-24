import React, { useState } from 'react';
import { ArrowLeft, Monitor, Users, Briefcase, PhoneCall, Lock } from 'lucide-react';
import { EquipamentosDashboard } from './EquipamentosDashboard';

export function OperacoesDashboard({ user, onBack }: any) {
    const [activeSubSector, setActiveSubSector] = useState<string | null>(null);

    if (activeSubSector === 'equipamentos') {
        return <EquipamentosDashboard user={user} onBack={() => setActiveSubSector(null)} />;
    }

    const subSectors = [
        { id: 'equipamentos', name: 'EQUIPAMENTOS', icon: Monitor },
        { id: 'rh', name: 'RH', icon: Users },
        { id: 'administracao', name: 'ADMINISTRAÇÃO', icon: Briefcase },
        { id: 'chamados', name: 'CHAMADOS', icon: PhoneCall },
        { id: 'empty1', name: '', icon: null },
        { id: 'empty2', name: '', icon: null },
        { id: 'empty3', name: '', icon: null },
        { id: 'empty4', name: '', icon: null },
        { id: 'empty5', name: '', icon: null },
    ];

    // For subsectors that don't have a dashboard yet
    const handleSelectSubSector = (id: string) => {
        if (id === 'equipamentos') {
            setActiveSubSector(id);
        } else {
            console.log('Subsetor ainda não implementado.');
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFBF7] bg-watermark flex flex-col items-center justify-center p-4 md:p-8 selection:bg-[#E3C78B]/30 selection:text-[#4A423D] font-sans relative">
            
            <div className="absolute top-4 left-4 md:top-8 md:left-8">
                <button 
                    onClick={onBack}
                    className="flex items-center gap-2 bg-white/60 backdrop-blur-md px-4 py-2.5 rounded-full text-[#8A827D] hover:text-[#C19A5B] hover:bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-colors group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" strokeWidth={1.5} />
                    <span className="text-sm font-semibold tracking-wide">Voltar</span>
                </button>
            </div>

            <div className="w-full max-w-4xl text-center mb-12 flex flex-col items-center mt-16 md:mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-6 overflow-hidden">
                    <img src="https://caase.com.br/uploads/agreements/filename/image_7376bc2cbd1d570e.png" alt="Logo" className="w-full h-full object-contain p-2 drop-shadow-md" referrerPolicy="no-referrer" />
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-medium tracking-[0.05em] text-[#4A423D] mb-3">Operações</h1>
                <p className="text-[11px] md:text-[12px] font-medium text-[#C19A5B] uppercase tracking-[0.3em]">Selecione o Subsetor</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700">
                {subSectors.map((sector) => {
                    const Icon = sector.icon;
                    
                    if (!sector.name) {
                        return (
                            <div key={sector.id} className="rounded-2xl h-32 md:h-40 w-full border border-dashed border-[#C19A5B]/20 bg-transparent opacity-50"></div>
                        );
                    }

                    return (
                        <button
                            key={sector.id}
                            onClick={() => handleSelectSubSector(sector.id)}
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
}

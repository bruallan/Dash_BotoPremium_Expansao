import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Database } from 'lucide-react';

export const BdFirebaseDashboard = ({ onBack }: any) => {
    const [loading, setLoading] = useState(true);
    const [cacheData, setCacheData] = useState<any>({});
    const [error, setError] = useState('');

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/debug/cache');
            if (!res.ok) throw new Error('Não foi possível carregar o cache.');
            const data = await res.json();
            setCacheData(data.data || {});
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const formatJSON = (json: any) => {
        try {
            return JSON.stringify(json, null, 2);
        } catch(e) {
            return String(json);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFBF7] p-4 md:p-8 w-full font-sans selection:bg-[#E3C78B]/30 selection:text-[#4A423D]">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-[0_8px_30px_rgb(193,154,91,0.2)] border border-[#C19A5B]/30">
                            <Database className="w-6 h-6 text-[#C19A5B]" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-display font-medium tracking-[0.05em] text-[#4A423D]">Banco de Dados Firebase (Cache)</h1>
                            <p className="text-gray-500 font-medium">Visualização bruta dos dados sincronizados</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-3">
                        <button onClick={fetchData} className="flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all outline-none focus:ring-2 focus:ring-[#C19A5B]/50">
                            <RefreshCw className="w-4 h-4" /> Atualizar
                        </button>
                        <button onClick={onBack} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all">
                            <ArrowLeft className="w-4 h-4" /> Voltar
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center p-12"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#C19A5B]" /></div>
                ) : error ? (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold">{error}</div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {Object.entries(cacheData).map(([key, value]) => (
                            <div key={key} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-display font-medium text-lg text-[#4A423D] mb-4 border-b pb-2 flex justify-between">
                                    <span>Documento: {key}</span>
                                    {value && (value as any).updated_at && <span className="text-sm text-gray-400 font-sans font-normal">Atualizado em: {new Date((value as any).updated_at).toLocaleString()}</span>}
                                </h3>
                                <pre className="bg-gray-50 p-4 rounded-xl text-xs overflow-auto max-h-96 text-gray-600 font-mono border border-gray-100 custom-scrollbar">
                                    {formatJSON(value)}
                                </pre>
                            </div>
                        ))}
                        {Object.keys(cacheData).length === 0 && (
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-500">
                                Nenhum dado em cache encontrado. Clique em "Sincronizar" no dashboard.
                            </div>
                        )}
                    </div>
                )}
            </div>
            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
            `}} />
        </div>
    );
};

import React, { useState, useMemo, useEffect } from 'react';
import { 
    ArrowLeft, Monitor, Smartphone, Keyboard, Search, AlertCircle, Wrench, 
    Package, RefreshCw, CheckCircle2, XCircle, TrendingUp, TrendingDown, 
    DollarSign, Activity, FileText, Settings, User 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- DATA MODEL & MOCKS ---
const MOCK_CATEGORIES = [
  { id: 'cat_note', name: 'Notebooks', vidaUtilMeses: 60, limiteCMVR: 0.35 },
  { id: 'cat_smart', name: 'Smartphones', vidaUtilMeses: 36, limiteCMVR: 0.20 },
  { id: 'cat_perif', name: 'Periféricos', vidaUtilMeses: 24, limiteCMVR: 0.50 },
];

const STATUSES = ['Em uso', 'Manutenção', 'Estoque', 'Descarte'];
const DEPARTAMENTOS = ['Vendas', 'Marketing', 'Operações', 'Tecnologia', 'RH'];

const initMocks = () => {
    const cols = Array.from({length: 20}).map((_, i) => ({
        id: `col_${i+1}`,
        nome: `Colaborador ${i+1}`,
        departamento: DEPARTAMENTOS[Math.floor(Math.random() * DEPARTAMENTOS.length)],
    }));

    const eqs: any[] = [];
    const mans: any[] = [];
    let count = 1;
    let manCount = 1;

    cols.forEach(col => {
        const noteValor = 4000 + Math.random() * 2000;
        const smartValor = 2000 + Math.random() * 1000;
        const perifValor = 200 + Math.random() * 300;
        const mesesAtras = (min: number, max: number) => Math.floor(Math.random() * (max - min) + min);
        
        const noteId = `eq_${count++}`;
        eqs.push({
            id: noteId,
            categoriaId: 'cat_note',
            modelo: `Dell Latitude ${Math.floor(Math.random() * 5000)}`,
            valorCompra: noteValor,
            valorReposicao: noteValor * 1.05,
            status: Math.random() > 0.8 ? 'Manutenção' : 'Em uso',
            dataCompra: new Date(new Date().setMonth(new Date().getMonth() - mesesAtras(10, 50))).toISOString(),
            colaboradorId: col.id
        });

        if (Math.random() > 0.5) {
            mans.push({
                data: new Date(new Date().setMonth(new Date().getMonth() - mesesAtras(1, 5))).toISOString(),
                valorGasto: Math.random() * 1000,
                equipamentoId: noteId
            });
        }

        const smartId = `eq_${count++}`;
        eqs.push({
            id: smartId,
            categoriaId: 'cat_smart',
            modelo: `iPhone ${12 + Math.floor(Math.random() * 3)}`,
            valorCompra: smartValor,
            valorReposicao: smartValor * 1.1,
            status: Math.random() > 0.85 ? 'Manutenção' : 'Em uso',
            dataCompra: new Date(new Date().setMonth(new Date().getMonth() - mesesAtras(5, 30))).toISOString(),
            colaboradorId: col.id
        });

        eqs.push({
            id: `eq_${count++}`,
            categoriaId: 'cat_perif',
            modelo: `Kit Teclado Mouse Logitech`,
            valorCompra: perifValor,
            valorReposicao: perifValor,
            status: 'Em uso',
            dataCompra: new Date(new Date().setMonth(new Date().getMonth() - mesesAtras(1, 12))).toISOString(),
            colaboradorId: col.id
        });
    });

    return { cols, eqs, mans };
};

// --- FUNCOES UTILITÁRIAS ---
export const calcIdadeMeses = (dataCompra: string) => {
    const diffTime = Math.abs(new Date().getTime() - new Date(dataCompra).getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
};

export const calcCMVR = (orcamento: number, totalManuts: number, vr: number, idadeMeses: number, vidaUtilMeses: number) => {
    if (vr === 0 || vidaUtilMeses === 0) return 0;
    return (((orcamento + totalManuts) / vr) * (idadeMeses / vidaUtilMeses));
};

const formatBrl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

// --- COMPONENTE PRINCIPAL ---
export function OperacoesDashboard({ user, onBack }: any) {
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [colaboradores, setColaboradores] = useState<any[]>([]);
    const [equipamentos, setEquipamentos] = useState<any[]>([]);
    const [manutencoes, setManutencoes] = useState<any[]>([]);

    // Accountability States
    const [selColIdState, setSelColIdState] = useState<string>('');
    
    // Manutencao States
    const [selEq, setSelEq] = useState<any>(null);
    const [orcamento, setOrcamento] = useState<string>('');
    const [isScraping, setIsScraping] = useState(false);

    // Inventario States
    const [filCat, setFilCat] = useState('');
    const [filStatus, setFilStatus] = useState('');
    const [filCol, setFilCol] = useState('');

    useEffect(() => {
        const { cols, eqs, mans } = initMocks();
        setColaboradores(cols);
        setEquipamentos(eqs);
        setManutencoes(mans);
    }, []);

    const getTotalManutsByEq = (eqId: string) => {
        return manutencoes.filter(m => m.equipamentoId === eqId).reduce((acc, m) => acc + m.valorGasto, 0);
    };

    const getCat = (catId: string) => MOCK_CATEGORIES.find(c => c.id === catId);

    // ABA 1 - DASHBOARD
    const renderDashboard = () => {
        const totalAtivos = equipamentos.reduce((acc, eq) => acc + eq.valorReposicao, 0);
        const eqPorStatus = equipamentos.reduce((acc, eq) => {
            acc[eq.status] = (acc[eq.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Gasto por eq
        const gastoPorEq = equipamentos.map(eq => ({
            ...eq,
            totalGasto: getTotalManutsByEq(eq.id)
        })).sort((a, b) => b.totalGasto - a.totalGasto).slice(0, 5);

        // Ação Exigida
        const acoesExigidas = equipamentos.filter(eq => {
            const cat = getCat(eq.categoriaId);
            if (!cat) return false;
            const idade = calcIdadeMeses(eq.dataCompra);
            if (idade >= cat.vidaUtilMeses) return true;
            
            const totalManuts = getTotalManutsByEq(eq.id);
            const cmvrAtual = calcCMVR(0, totalManuts, eq.valorReposicao, idade, cat.vidaUtilMeses);
            return cmvrAtual > cat.limiteCMVR;
        });

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <p className="text-sm font-bold text-gray-500 uppercase">Total Ativos (Reposição)</p>
                        <h3 className="text-3xl font-black text-gray-800 mt-2">{formatBrl(totalAtivos)}</h3>
                    </div>
                    {STATUSES.map(stat => (
                        <div key={stat} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <p className="text-sm font-bold text-gray-500 uppercase">% {stat}</p>
                            <h3 className="text-3xl font-black text-gray-800 mt-2">
                                {(((eqPorStatus[stat] || 0) / equipamentos.length) * 100).toFixed(1)}%
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">{eqPorStatus[stat] || 0} de {equipamentos.length}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-amber-500"/> Top 5 Gastos em Manutenção</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="py-2 px-4 text-xs tracking-wider uppercase text-gray-500">Modelo</th>
                                        <th className="py-2 px-4 text-xs tracking-wider uppercase text-gray-500">Categoria</th>
                                        <th className="py-2 px-4 text-xs tracking-wider uppercase text-gray-500 text-right">Custo Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {gastoPorEq.map(eq => (
                                        <tr key={eq.id} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="py-3 px-4 text-sm font-medium text-gray-800">{eq.modelo}</td>
                                            <td className="py-3 px-4 text-sm text-gray-500">{getCat(eq.categoriaId)?.name}</td>
                                            <td className="py-3 px-4 text-sm font-bold text-red-500 text-right">{formatBrl(eq.totalGasto)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm">
                         <h3 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2"><AlertCircle className="w-5 h-5"/> Ação Exigida (CMVR Crítico ou Vida Útil)</h3>
                         {acoesExigidas.length === 0 ? (
                             <div className="flex flex-col items-center justify-center p-8 text-green-500">
                                <CheckCircle2 className="w-12 h-12 mb-2" />
                                <span className="font-bold">Todos os equipamentos saudáveis!</span>
                             </div>
                         ) : (
                            <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                                {acoesExigidas.map(eq => {
                                    const cat = getCat(eq.categoriaId);
                                    const idade = calcIdadeMeses(eq.dataCompra);
                                    const alertaVida = idade >= (cat?.vidaUtilMeses || 999);
                                    return (
                                        <div key={eq.id} className="p-4 bg-red-50 border border-red-100 rounded-xl flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-gray-800">{eq.modelo}</p>
                                                <p className="text-xs text-red-600 font-medium">Resp: {colaboradores.find(c => c.id === eq.colaboradorId)?.nome}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-bold uppercase tracking-wide">
                                                    {alertaVida ? 'Vida Útil Esgotada' : 'CMVR Estourado'}
                                                </span>
                                                <p className="text-xs text-gray-500 mt-1">{idade} meses de uso</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                         )}
                    </div>
                </div>
            </div>
        )
    };

    // ABA 2 - ACCOUNTABILITY
    const renderAccountability = () => {
        const selColId = selColIdState || colaboradores[0]?.id || '';
        const setSelColId = setSelColIdState;
        
        const selCol = colaboradores.find(c => c.id === selColId);
        const eqsCol = equipamentos.filter(e => e.colaboradorId === selColId);
        const manutsCol = manutencoes.filter(m => eqsCol.some(e => e.id === m.equipamentoId));
        
        const kitTotal = eqsCol.reduce((acc, eq) => acc + eq.valorReposicao, 0);

        // Frequencia media global
        const averageManuts = manutencoes.length / colaboradores.length;
        const isAcimaMedia = manutsCol.length > averageManuts;

        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="col-span-1 bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden flex flex-col">
                    <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-700">Colaboradores</div>
                    <div className="flex-1 overflow-y-auto max-h-[600px]">
                        {colaboradores.map(c => (
                            <button 
                                key={c.id} 
                                onClick={() => setSelColId(c.id)}
                                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-amber-50 transition-colors flex items-center justify-between ${selColId === c.id ? 'bg-amber-50 border-l-4 border-l-amber-500' : ''}`}
                            >
                                <div>
                                    <p className={`font-bold ${selColId === c.id ? 'text-amber-700' : 'text-gray-700'}`}>{c.nome}</p>
                                    <p className="text-xs text-gray-500">{c.departamento}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="col-span-1 md:col-span-3 space-y-6">
                    {selCol && (
                        <>
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-800">{selCol.nome}</h2>
                                    <p className="text-gray-500 font-medium">Departamento: {selCol.departamento}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-gray-400 uppercase">Valor Atual do Kit</p>
                                    <p className="text-3xl font-black text-amber-600">{formatBrl(kitTotal)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4">Kit Equipamentos</h3>
                                    <div className="space-y-3">
                                        {eqsCol.map(eq => (
                                            <div key={eq.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                                <div>
                                                    <p className="font-bold text-gray-800">{eq.modelo}</p>
                                                    <p className="text-xs text-gray-500">{getCat(eq.categoriaId)?.name} • Status: {eq.status}</p>
                                                </div>
                                                <div className="font-bold text-gray-600">{formatBrl(eq.valorReposicao)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                     <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-bold text-gray-800">Histórico de Quebras</h3>
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${isAcimaMedia ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {isAcimaMedia ? 'Acima da Média Global' : 'Abaixo/Na Média'} ({manutsCol.length})
                                        </div>
                                     </div>
                                     <div className="space-y-3">
                                        {manutsCol.length === 0 ? (
                                            <p className="text-gray-500 italic text-sm">Nenhuma manutenção registrada.</p>
                                        ) : manutsCol.map((m, i) => {
                                            const eq = eqsCol.find(e => e.id === m.equipamentoId);
                                            return (
                                            <div key={i} className="flex justify-between items-center p-3 border border-gray-100 rounded-xl">
                                                <div>
                                                    <p className="font-medium text-sm text-gray-800">{new Date(m.data).toLocaleDateString()}</p>
                                                    <p className="text-xs text-gray-500">{eq?.modelo}</p>
                                                </div>
                                                <div className="font-bold text-red-500">{formatBrl(m.valorGasto)}</div>
                                            </div>
                                        )})}
                                     </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        )
    };

    // ABA 3 - MANUTENCAO E SIMULADOR
    const renderManutencao = () => {
        const eqsManutencao = equipamentos.filter(e => e.status === 'Manutenção');

        const handleScrape = () => {
            setIsScraping(true);
            setTimeout(() => {
                const varPct = (Math.random() * 0.1) - 0.05; // -5% to +5%
                const newVal = selEq.valorReposicao * (1 + varPct);
                
                setEquipamentos(equipamentos.map(e => e.id === selEq.id ? { ...e, valorReposicao: newVal } : e));
                setSelEq({ ...selEq, valorReposicao: newVal });
                setIsScraping(false);
            }, 2000);
        };

        const orcNum = parseFloat(orcamento) || 0;
        const totalManuts = selEq ? getTotalManutsByEq(selEq.id) : 0;
        const cat = selEq ? getCat(selEq.categoriaId) : null;
        const idade = selEq ? calcIdadeMeses(selEq.dataCompra) : 0;
        const cmvr = (selEq && cat) ? calcCMVR(orcNum, totalManuts, selEq.valorReposicao, idade, cat.vidaUtilMeses) : 0;
        
        let recomendacao = 'Aguardando inputs';
        let recStyle = 'bg-gray-100 text-gray-600';
        if (selEq && cat) {
            if (cmvr > cat.limiteCMVR || idade > cat.vidaUtilMeses) {
                recomendacao = 'DESCARTAR / SUBSTITUIR';
                recStyle = 'bg-red-500 text-white';
            } else {
                recomendacao = 'APROVAR CONSERTO';
                recStyle = 'bg-green-500 text-white';
            }
        }

        const handleSaveManutencao = () => {
            if (orcNum <= 0) return;
            const newM = {
                data: new Date().toISOString(),
                valorGasto: orcNum,
                equipamentoId: selEq.id
            };
            setManutencoes([newM, ...manutencoes]);
            // return to Em Uso
            setEquipamentos(equipamentos.map(e => e.id === selEq.id ? { ...e, status: 'Em uso' } : e));
            setSelEq(null);
            setOrcamento('');
        };

        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 col-span-1 md:col-span-1 max-h-[700px] overflow-y-auto">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 pb-4 border-b border-gray-100">Na Assistência ({eqsManutencao.length})</h3>
                    <div className="space-y-3">
                        {eqsManutencao.map(eq => (
                            <button 
                                key={eq.id} 
                                onClick={() => { setSelEq({ ...eq }); setOrcamento(''); }}
                                className={`w-full text-left p-4 rounded-xl border transition-colors ${selEq?.id === eq.id ? 'bg-amber-50 border-amber-400 shadow-sm' : 'border-gray-100 hover:border-gray-300'}`}
                            >
                                <p className="font-bold text-gray-800">{eq.modelo}</p>
                                <p className="text-xs text-gray-500 mt-1">Resp: {colaboradores.find(c => c.id === eq.colaboradorId)?.nome}</p>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="col-span-1 md:col-span-2">
                    {selEq ? (
                        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-800">{selEq.modelo}</h2>
                                    <p className="text-gray-500 font-medium">{cat?.name} • ID: {selEq.id}</p>
                                </div>
                                <div className={`px-4 py-2 rounded-xl text-sm font-black tracking-wide shrink-0 ${recStyle}`}>
                                    {recomendacao}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <p className="text-xs font-bold text-gray-400 uppercase">Idade / Vida Útil</p>
                                    <p className="text-lg font-bold text-gray-800 mt-1">{idade} / {cat?.vidaUtilMeses} meses</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <p className="text-xs font-bold text-gray-400 uppercase">Histórico de Manutenções</p>
                                    <p className="text-lg font-bold text-red-600 mt-1">{formatBrl(totalManuts)}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 col-span-2 flex justify-between items-center">
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase">Valor de Reposição Atualizado</p>
                                        <p className="text-xl font-bold text-gray-800 mt-1">{formatBrl(selEq.valorReposicao)}</p>
                                    </div>
                                    <button 
                                        onClick={handleScrape}
                                        disabled={isScraping}
                                        className="flex items-center gap-2 bg-amber-100 text-amber-700 hover:bg-amber-200 px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                                    >
                                        {isScraping ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4" />}
                                        Acionar Scraper de Preço
                                    </button>
                                </div>
                            </div>

                            <div className="border-t border-gray-200 pt-8 mb-8">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Valor do Orçamento Atual (R$)</label>
                                <input 
                                    type="number" 
                                    value={orcamento} 
                                    onChange={(e) => setOrcamento(e.target.value)}
                                    className="w-full text-2xl font-black p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl">
                                <div className="flex justify-between items-center mb-4">
                                    <p className="font-bold text-blue-900">Índice de Substituição (CMVR Misto)</p>
                                    <p className="text-2xl font-black text-blue-900">{(cmvr * 100).toFixed(1)}%</p>
                                </div>
                                <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden">
                                     <div className={`h-2.5 rounded-full ${cmvr > (cat?.limiteCMVR || 1) ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${Math.min(cmvr * 100, 100)}%` }}></div>
                                </div>
                                <p className="text-xs font-bold text-blue-700 mt-2 text-right">Limite da Categoria: {((cat?.limiteCMVR || 0) * 100).toFixed(0)}%</p>
                            </div>

                            {orcNum > 0 && recomendacao === 'APROVAR CONSERTO' && (
                                <button onClick={handleSaveManutencao} className="w-full mt-6 bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-xl text-lg shadow-lg shadow-green-500/30 transition-all">
                                    Aplicar Conserto e Voltar para Em Uso
                                </button>
                            )}

                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-white border border-gray-100 border-dashed rounded-2xl p-12">
                            <Wrench className="w-16 h-16 mb-4 opacity-50" />
                            <p className="font-bold text-lg">Selecione um equipamento em manutenção para simular</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // ABA 4 - INVENTARIO BRUTO
    const renderInventario = () => {
        const filtered = equipamentos.filter(eq => {
            if (filCat && eq.categoriaId !== filCat) return false;
            if (filStatus && eq.status !== filStatus) return false;
            if (filCol && eq.colaboradorId !== filCol) return false;
            return true;
        });

        return (
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <select value={filCat} onChange={e => setFilCat(e.target.value)} className="p-2 border border-gray-200 rounded-lg bg-white outline-none font-medium text-sm">
                        <option value="">Todas Categorias</option>
                        {MOCK_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select value={filStatus} onChange={e => setFilStatus(e.target.value)} className="p-2 border border-gray-200 rounded-lg bg-white outline-none font-medium text-sm">
                        <option value="">Todos Status</option>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={filCol} onChange={e => setFilCol(e.target.value)} className="p-2 border border-gray-200 rounded-lg bg-white outline-none font-medium text-sm">
                        <option value="">Todos Colaboradores</option>
                        {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                    <div className="ml-auto font-bold text-gray-500 flex items-center">
                        Total: {filtered.length} ativos
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-gray-200">
                                <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Equipamento</th>
                                <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Responsável</th>
                                <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Reposição R$</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(eq => (
                                <tr key={eq.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-3 px-4 text-sm text-gray-500 font-mono">{eq.id}</td>
                                    <td className="py-3 px-4">
                                        <p className="font-bold text-gray-800">{eq.modelo}</p>
                                        <p className="text-xs text-gray-500">{getCat(eq.categoriaId)?.name}</p>
                                    </td>
                                    <td className="py-3 px-4 text-sm font-medium text-gray-700">{colaboradores.find(c => c.id === eq.colaboradorId)?.nome}</td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide
                                            ${eq.status === 'Em uso' ? 'bg-green-100 text-green-700' : 
                                              eq.status === 'Manutenção' ? 'bg-amber-100 text-amber-700' :
                                              eq.status === 'Estoque' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'
                                            }
                                        `}>{eq.status}</span>
                                    </td>
                                    <td className="py-3 px-4 text-sm font-bold text-gray-800 text-right">{formatBrl(eq.valorReposicao)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    };

    const TABS = [
        { id: 'Dashboard', icon: Activity },
        { id: 'Accountability', icon: User },
        { id: 'Simulador', icon: Wrench },
        { id: 'Inventário', icon: FileText },
    ];

    return (
        <div className="min-h-screen bg-[#F8F9FA] p-4 md:p-8 w-full font-sans selection:bg-amber-100 selection:text-amber-900">
            <div className="max-w-[1600px] mx-auto w-full">
            {/* Header global padrao */}
            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
                <div className="flex items-center gap-4 w-full xl:w-auto">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-amber-600/30 border border-amber-400/50 overflow-hidden shrink-0">
                        <img src="https://caase.com.br/uploads/agreements/filename/image_7376bc2cbd1d570e.png" alt="Logo" className="w-full h-full object-contain p-1.5" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-gray-900 leading-none mb-1">OPERAÇÕES</h1>
                        <p className="text-[10px] text-amber-600 font-extrabold uppercase tracking-[0.2em] leading-none">Painel de Controle Estratégico</p>
                    </div>
                </div>
                
                <div className="w-full xl:w-auto mt-4 xl:mt-0">
                    <div className="flex flex-wrap items-center justify-start xl:justify-end gap-4 md:gap-6">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 text-sm font-bold transition-all duration-300 ${
                                    activeTab === tab.id 
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-550 text-white px-6 py-2.5 rounded-2xl shadow-md shadow-amber-500/30' 
                                        : 'text-gray-500 hover:text-amber-600'
                                }`}
                            >
                                <tab.icon className="w-4 h-4 shrink-0" />
                                <span>{tab.id}</span>
                            </button>
                        ))}
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

            {/* Content */}
            <main className="pb-10">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">{activeTab}</h2>
                        <p className="text-sm font-medium text-gray-400 mt-1 uppercase tracking-widest">Métricas e performance em tempo real</p>
                    </div>
                </div>
                {activeTab === 'Dashboard' && renderDashboard()}
                {activeTab === 'Accountability' && renderAccountability()}
                {activeTab === 'Simulador' && renderManutencao()}
                {activeTab === 'Inventário' && renderInventario()}
            </main>
            </div>
        </div>
    );
}

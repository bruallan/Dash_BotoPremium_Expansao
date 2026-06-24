import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, DollarSign, TrendingUp, AlertTriangle, Briefcase, Activity, Calendar, Filter, RefreshCw, ArrowLeft } from 'lucide-react';
import { 
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    AreaChart, Area, ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';
import { differenceInDays, subMonths, isAfter, startOfMonth, parseISO } from 'date-fns';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const FinanceiroDashboard = ({ onBack }: { onBack?: () => void }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Filtros
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [filterCC, setFilterCC] = useState('ALL');

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/data/financeiro');
            const json = await res.json();
            if (json.success && json.data) {
                setData(json.data);
                setError('');
            } else {
                setError(json.message || 'Dados não encontrados. Aguardando execução do CRON.');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleForceSync = async () => {
        setIsSyncing(true);
        try {
            const res = await fetch('/api/data/financeiro/sync', { method: 'POST' });
            const json = await res.json();
            if (json.success && json.data) {
                setData(json.data);
                setError('');
                alert("Sincronização concluída com sucesso!");
            } else {
                console.error(json);
                alert("Erro ao sincronizar: " + json.message);
                await fetchData();
            }
        } catch (err: any) {
            alert("Erro ao sincronizar: " + err.message);
        } finally {
            setIsSyncing(false);
        }
    };


    const { saldoCaixaAtual = 0, eventos = [], contratos = [] } = data || {};

    const availableMonths = useMemo(() => {
        const m = new Set<string>();
        eventos.forEach((e: any) => {
            if (e.data_vencimento) m.add(e.data_vencimento.substring(0, 7));
        });
        return Array.from(m).sort().reverse();
    }, [eventos]);

    const availableCC = useMemo(() => {
        const c = new Set<string>();
        eventos.forEach((e: any) => {
            (e.centros_custo || []).forEach((cc: any) => c.add(cc.nome));
        });
        return Array.from(c).sort();
    }, [eventos]);

    const filteredEventos = useMemo(() => {
        return eventos.filter((e: any) => {
            let passDate = true;
            if (e.data_vencimento) {
                const docDate = e.data_vencimento.split('T')[0];
                if (filterStartDate && docDate < filterStartDate) passDate = false;
                if (filterEndDate && docDate > filterEndDate) passDate = false;
            } else if (filterStartDate || filterEndDate) {
                passDate = false;
            }

            let passCC = filterCC === 'ALL' || (e.centros_custo || []).some((c: any) => c.nome === filterCC);
            return passDate && passCC;
        });
    }, [eventos, filterStartDate, filterEndDate, filterCC]);

    // Abas
    const [activeTab, setActiveTab] = useState(1);

    const checkCategoria = (item: any, keyword: string) => {
        return (item.categorias || []).some((c: any) => (c.nome || '').toLowerCase().includes(keyword.toLowerCase()));
    };

    const isDespesaOperacional = (item: any) => {
        return !checkCategoria(item, "capex") && !checkCategoria(item, "lucro") && !checkCategoria(item, "dividendos");
    };

    const metrics = useMemo(() => {
        let recBrutaTotal = 0;
        let opex = 0;
        
        let royaltiesFat = 0;
        let royaltiesRec = 0;
        let fppRec = 0;
        let fppDes = 0;
        let supplyRec = 0;

        let cacMkt = 0;
        let ctsSuporte = 0;
        let cliRoyalties = new Set<string>();
        let recebidaTxFranquia = 0;

        let defaultValor = 0;
        let globalTotalRec = 0;
        
        let txFranquiaExp = 0;

        const fluxos: Record<string, { name: string, Recebido: number, Pago: number }> = {};
        const compRec: Record<string, number> = {};
        const plCascata: Record<string, number> = {};
        
        const agingMap = { "0-30": 0, "31-60": 0, "61-90": 0, "+90": 0 };
        const riscoClientes: Record<string, { id: string, name: string, capacidade: number, divida: number, supply: number, royalties: number }> = {};

        const getRisk = (id: string, name: string) => {
            if (!riscoClientes[id]) riscoClientes[id] = { id, name: name || 'Desconhecido', capacidade: 0, divida: 0, supply: 0, royalties: 0 };
            return riscoClientes[id];
        };

        filteredEventos.forEach((e: any) => {
            const pago = e.pago || 0;
            const total = e.total || 0;
            const status = e.status;
            const month = e.data_vencimento?.substring(0, 7) || 'Outros';
            const catName = e.categorias?.[0]?.nome || 'Outros';
            const cid = e.cliente?.id;
            const cname = e.cliente?.nome;

            if (!fluxos[month]) fluxos[month] = { name: month, Recebido: 0, Pago: 0 };

            if (e.tipo === 'RECEITA') {
                globalTotalRec += total;
                if (checkCategoria(e, 'royalt')) royaltiesFat += total;

                if (status === 'ATRASADO' || status === 'PERDIDO') {
                    defaultValor += e.nao_pago || 0;
                    if (cid) getRisk(cid, cname).divida += e.nao_pago;

                    if (status === 'ATRASADO' && e.data_vencimento) {
                        const dias = differenceInDays(new Date(), new Date(e.data_vencimento));
                        if (dias <= 30) agingMap["0-30"] += e.nao_pago;
                        else if (dias <= 60) agingMap["31-60"] += e.nao_pago;
                        else if (dias <= 90) agingMap["61-90"] += e.nao_pago;
                        else agingMap["+90"] += e.nao_pago;
                    }
                }

                if (status === 'RECEBIDO') {
                    recBrutaTotal += pago;
                    fluxos[month].Recebido += pago;

                    if (cid) getRisk(cid, cname).capacidade += pago;

                    let cKey = "Outros";
                    if (checkCategoria(e, 'royalt')) { cKey = "Royalties"; royaltiesRec += pago; if (cid) { cliRoyalties.add(cid); getRisk(cid, cname).royalties += pago; } }
                    else if (checkCategoria(e, 'fpp') || checkCategoria(e, 'propaganda')) { cKey = "FPP"; fppRec += pago; }
                    else if (checkCategoria(e, 'franquia') || checkCategoria(e, 'taxa')) { cKey = "Taxa de Franquia"; recebidaTxFranquia++; txFranquiaExp += pago; }
                    else if (checkCategoria(e, 'supply') || checkCategoria(e, 'rebate')) { cKey = "Supply"; supplyRec += pago; if(cid) getRisk(cid, cname).supply += pago; }
                    
                    compRec[cKey] = (compRec[cKey] || 0) + pago;
                }
            } else {
                if (status === 'RECEBIDO' || status === 'PAGO') {
                    fluxos[month].Pago += pago;
                    plCascata[catName] = (plCascata[catName] || 0) + pago;

                    if (isDespesaOperacional(e)) opex += pago;
                    if (checkCategoria(e, 'fpp') || checkCategoria(e, 'propaganda')) fppDes += pago;
                    if (checkCategoria(e, 'marketing') || checkCategoria(e, 'expans')) cacMkt += pago;
                    if (checkCategoria(e, 'suporte') || checkCategoria(e, 'sac')) ctsSuporte += pago;
                }
            }
        });

        // Calculos baseados no eventos GERAIS e não filtrados (Runway, Safra)
        const limit3 = subMonths(new Date(), 3);
        const sum3 = eventos.filter((e:any) => e.tipo === 'DESPESA' && e.status === 'RECEBIDO' && isDespesaOperacional(e) && new Date(e.data_vencimento) > limit3).reduce((acc: number, e: any) => acc + e.pago, 0);
        const mdSaida = (sum3 / 3) || 1;
        const runway = saldoCaixaAtual / mdSaida;

        // Safra Analytics
        const limit6 = subMonths(new Date(), 6);
        let tr = 0; let trCount = 0;
        const evolution: Record<string, any> = {};

        contratos.forEach((c: any) => {
            const di = c.data_inicio ? new Date(c.data_inicio) : null;
            if (di) {
                const isNew = isAfter(di, limit6);
                if (isNew && c.cliente_id && riscoClientes[c.cliente_id] && riscoClientes[c.cliente_id].royalties > 0) {
                    tr += riscoClientes[c.cliente_id].royalties;
                    trCount++;
                }
                
                // Evolucao de safra
                const coorte = `${di.getFullYear()}-${String(di.getMonth()+1).padStart(2,'0')}`;
                if (!evolution[coorte]) evolution[coorte] = { name: coorte, data: [0,0,0,0,0,0,0,0,0,0,0,0] };
                
                // Distribui os pagamentos de royalties desse cliente nesse coorte pelos "meses de vida"
                const pg = eventos.filter((e:any) => e.tipo === 'RECEITA' && e.status === 'RECEBIDO' && e.cliente?.id === c.cliente_id && checkCategoria(e, 'royalt'));
                pg.forEach((p:any) => {
                    const diff = differenceInDays(new Date(p.data_vencimento), di) / 30;
                    const mesCorrente = Math.floor(diff);
                    if (mesCorrente >= 0 && mesCorrente < 12) {
                        evolution[coorte].data[mesCorrente] += p.pago;
                    }
                });
            }
        });

        // Formatação Safra Line Chart
        const safraLinesData = Array.from({length: 12}).map((_, i) => {
            const point: any = { mesTx: `Mês ${i+1}` };
            Object.values(evolution).forEach(coorte => {
                point[coorte.name] = coorte.data[i] || 0;
            });
            return point;
        });

        const wData = [];
        let rCascata = recBrutaTotal;
        wData.push({ name: 'Receita Bruta', valor: rCascata, type: 'receita' });
        Object.keys(plCascata).sort((a,b) => plCascata[b] - plCascata[a]).slice(0, 8).forEach(k => {
            wData.push({ name: k, valor: -plCascata[k], type: 'despesa' });
            rCascata -= plCascata[k];
        });
        wData.push({ name: 'Lucro Op', valor: rCascata, type: rCascata >= 0 ? 'lucro' : 'prejuizo' });
        
        return {
            recBrutaTotal, ebitda: recBrutaTotal - opex, runway,
            chartExposicaoCaixa: Object.values(fluxos).sort((a,b) => a.name.localeCompare(b.name)),
            chartComposicao: Object.keys(compRec).map(k => ({ name: k, value: compRec[k] })).sort((a,b)=>b.value - a.value),
            
            royaltiesFat, royaltiesRec, saldoFpp: fppRec - fppDes, supplyRec,
            execucaoFpp: fppRec > 0 ? (fppDes / fppRec) * 100 : 0,

            opex, cac: recebidaTxFranquia > 0 ? (cacMkt / recebidaTxFranquia) : 0,
            cts: cliRoyalties.size > 0 ? (ctsSuporte / cliRoyalties.size) : 0,
            waterfall: wData,
            
            taxaDefault: globalTotalRec > 0 ? (defaultValor / globalTotalRec) * 100 : 0,
            agingMap,
            riscoArr: Object.values(riscoClientes).filter(c => c.capacidade > 0 || c.divida > 0),
            
            txFranquiaExp,
            ticketMedioNew: trCount > 0 ? (tr / trCount) : 0,
            safraLinesData, evolutionKeys: Object.keys(evolution)
        };
    }, [filteredEventos, eventos, saldoCaixaAtual, contratos]);
    
    // --- Renderização Principal ---
    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] bg-watermark"><Loader2 className="w-10 h-10 animate-spin text-[#C19A5B]" /></div>;
    }

    if (error || !data) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7] bg-watermark p-6 gap-6">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center max-w-md w-full gap-4">
                    <AlertTriangle className="w-12 h-12 text-[#C19A5B]" />
                    <h2 className="text-xl font-black text-[#4A423D]">Dashboard Vazio</h2>
                    <p className="text-gray-500 font-medium">{error}</p>
                    
                    <button 
                        onClick={handleForceSync}
                        disabled={isSyncing}
                        className="mt-2 w-full bg-[#C19A5B] px-4 py-3 rounded-xl text-white font-bold text-sm flex justify-center items-center gap-2 hover:bg-amber-600 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Sincronizando (aprox. 1 min)...' : 'Sincronizar Dados Agora'}
                    </button>

                    {onBack && (
                        <button onClick={onBack} className="mt-2 text-gray-400 hover:text-gray-600 font-bold text-sm transition-colors">
                            Voltar para o Menu
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 1, name: 'Resumo e Tesouraria', icon: Activity },
        { id: 2, name: 'Receitas e FPP', icon: TrendingUp },
        { id: 3, name: 'Custos e P&L', icon: DollarSign },
        { id: 4, name: 'Risco e Defaults', icon: AlertTriangle },
        { id: 5, name: 'Safra e Expansão', icon: Briefcase }
    ];

    return (
        <div className="min-h-screen bg-[#FDFBF7] bg-watermark p-4 md:p-8 w-full font-sans selection:bg-[#E3C78B]/30 selection:text-[#4A423D]">
            <div className="max-w-[1600px] mx-auto w-full">
                
                {/* Header */}
                <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
                    <div className="flex items-center gap-4 w-full xl:w-auto">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-[0_8px_30px_rgb(193,154,91,0.2)] border border-[#C19A5B]/30 overflow-hidden shrink-0">
                            <img src="https://caase.com.br/uploads/agreements/filename/image_7376bc2cbd1d570e.png" alt="Logo" className="w-full h-full object-contain p-1.5" referrerPolicy="no-referrer" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-display font-medium tracking-[0.05em] text-[#4A423D] leading-none mb-1">FINANCEIRO</h1>
                            <p className="text-[10px] text-[#C19A5B] font-extrabold uppercase tracking-[0.2em] leading-none">Painel de Controle Estratégico</p>
                        </div>
                    </div>

                    <div className="w-full xl:w-auto mt-4 xl:mt-0">
                        <div className="flex flex-wrap items-center justify-start xl:justify-end gap-4 md:gap-6">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 text-sm font-bold transition-all duration-300 ${
                                        activeTab === tab.id 
                                            ? 'bg-gradient-to-r from-amber-500 to-amber-550 text-white px-6 py-2.5 rounded-2xl shadow-md shadow-[0_8px_30px_rgb(193,154,91,0.2)]' 
                                            : 'text-gray-500 hover:text-[#C19A5B]'
                                    }`}
                                >
                                    <tab.icon className="w-4 h-4 shrink-0" />
                                    <span>{tab.name}</span>
                                </button>
                            ))}
                            {onBack && (
                                <button 
                                    onClick={onBack}
                                    className="flex items-center justify-center gap-2 text-sm font-bold text-gray-400 hover:text-[#C19A5B] transition-all duration-300 shrink-0 ml-2"
                                    title="Voltar aos Setores"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                {/* Filters */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-8 flex flex-col md:flex-row gap-6 items-center justify-between">
                    <div className="flex items-center gap-3 w-full md:w-auto flex-wrap md:flex-nowrap">
                        <div className="bg-amber-50 p-2 rounded-lg hidden md:block"><Filter className="w-5 h-5 text-[#C19A5B]" /></div>
                        
                        <div className="flex items-center gap-2 min-w-max">
                            <strong className="text-xs font-bold text-gray-400 uppercase tracking-wider">Período:</strong>
                            <input 
                                type="date" 
                                value={filterStartDate} 
                                onChange={e => setFilterStartDate(e.target.value)} 
                                className="bg-white border border-gray-200 rounded-lg p-2 text-sm font-bold text-gray-700 outline-none hover:border-[#C19A5B] focus:border-[#C19A5B] transition-all shadow-sm"
                            />
                            <span className="text-gray-400">até</span>
                            <input 
                                type="date" 
                                value={filterEndDate} 
                                onChange={e => setFilterEndDate(e.target.value)} 
                                className="bg-white border border-gray-200 rounded-lg p-2 text-sm font-bold text-gray-700 outline-none hover:border-[#C19A5B] focus:border-[#C19A5B] transition-all shadow-sm"
                            />
                        </div>
                        
                        <div className="flex items-center gap-2 min-w-max">
                            <strong className="text-xs font-bold text-gray-400 uppercase tracking-wider">C.Custo:</strong>
                            <select value={filterCC} onChange={e => setFilterCC(e.target.value)} className="bg-white border border-gray-200 rounded-lg p-2 text-sm font-bold text-gray-700 outline-none hover:border-[#C19A5B] focus:border-[#C19A5B] transition-all shadow-sm">
                                <option value="ALL">Todos C.Custo</option>
                                {availableCC.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <button 
                            onClick={handleForceSync}
                            disabled={isSyncing}
                            className="flex items-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all hover:bg-emerald-100 ml-2 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? 'Sincronizando' : 'Sincronizar'}
                        </button>
                    </div>
                </div>

                    {/* Aba 1 */}
                {activeTab === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-xs font-bold text-gray-500 uppercase">Saldo em Caixa Atual</p>
                                <p className="text-2xl font-black text-[#4A423D] mt-1">{formatCurrency(saldoCaixaAtual)}</p>
                            </div>
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-xs font-bold text-gray-500 uppercase">Receita Bruta (Filtro)</p>
                                <p className="text-2xl font-black text-[#4A423D] mt-1">{formatCurrency(metrics.recBrutaTotal)}</p>
                            </div>
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-xs font-bold text-gray-500 uppercase">EBITDA (Filtro)</p>
                                <p className={`text-2xl font-black mt-1 ${metrics.ebitda >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(metrics.ebitda)}</p>
                            </div>
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-xs font-bold text-gray-500 uppercase">Runway (Sobrevida)</p>
                                <p className="text-2xl font-black text-[#4A423D] mt-1">{metrics.runway.toFixed(1)} Meses</p>
                                <p className="text-[10px] uppercase text-gray-400 mt-1">Base: 3 Meses</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="text-sm font-bold text-gray-800 mb-6 uppercase">Exposição de Caixa Mensal</h3>
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={metrics.chartExposicaoCaixa}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(v) => `R$${(v/1000)}k`} />
                                            <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Legend iconType="circle" />
                                            <Bar dataKey="Recebido" fill="#10B981" radius={[4, 4, 0, 0]} barSize={30} />
                                            <Bar dataKey="Pago" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={30} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 pr-8">
                                <h3 className="text-sm font-bold text-gray-800 mb-6 uppercase">Composição da Receita</h3>
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={metrics.chartComposicao} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(v) => `R$${(v/1000)}k`} />
                                            <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#374151', fontWeight: 600 }} width={110} />
                                            <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Bar dataKey="value" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={25} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Aba 2: Receitas & FPP */}
                {activeTab === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-xs font-bold text-gray-500 uppercase">Royalties Faturados</p>
                                <p className="text-2xl font-black text-[#4A423D] mt-1">{formatCurrency(metrics.royaltiesFat)}</p>
                            </div>
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-xs font-bold text-gray-500 uppercase">Royalties Recebidos</p>
                                <p className="text-2xl font-black text-green-600 mt-1">{formatCurrency(metrics.royaltiesRec)}</p>
                            </div>
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-xs font-bold text-gray-500 uppercase">Saldo FPP Líquido</p>
                                <p className={`text-2xl font-black mt-1 ${metrics.saldoFpp >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(metrics.saldoFpp)}</p>
                            </div>
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-xs font-bold text-gray-500 uppercase">Supply & Rebates</p>
                                <p className="text-2xl font-black text-[#4A423D] mt-1">{formatCurrency(metrics.supplyRec)}</p>
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-800 mb-2 uppercase">Execução do FPP</h3>
                            <div className="w-full bg-gray-100 rounded-full h-8 overflow-hidden relative">
                                <div className="bg-blue-500 h-8 transition-all" style={{ width: `${Math.min(metrics.execucaoFpp, 100)}%` }}></div>
                                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#4A423D] drop-shadow-sm">{metrics.execucaoFpp.toFixed(1)}% do orçamento de FPP investido</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Aba 3: Custos & U.E. */}
                {activeTab === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-xs font-bold text-gray-500 uppercase">OPEX Total</p>
                                <p className="text-2xl font-black text-red-600 mt-1">{formatCurrency(metrics.opex)}</p>
                            </div>
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-xs font-bold text-gray-500 uppercase">CAC Médio</p>
                                <p className="text-2xl font-black text-orange-600 mt-1">{formatCurrency(metrics.cac)}</p>
                            </div>
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-xs font-bold text-gray-500 uppercase">Custo de Servir (CTS / unid)</p>
                                <p className="text-2xl font-black text-blue-600 mt-1">{formatCurrency(metrics.cts)}</p>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 pr-8">
                            <h3 className="text-sm font-bold text-gray-800 mb-6 uppercase">Cascata de P&L (Waterfall)</h3>
                            <div className="h-96">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={metrics.waterfall}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} angle={-25} textAnchor="end" height={60} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                                        <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Bar dataKey="valor" radius={[4, 4, 0, 0]} barSize={40}>
                                            {metrics.waterfall.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.type === 'receita' ? '#10B981' : entry.type === 'despesa' ? '#EF4444' : entry.type === 'lucro' ? '#3B82F6' : '#EF4444'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* Aba 4: Risco */}
                {activeTab === 4 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center h-48">
                                <p className="text-sm font-bold text-gray-500 uppercase">Inadimplência Total</p>
                                <p className="text-5xl font-black text-red-600 mt-2">{metrics.taxaDefault.toFixed(2)}%</p>
                                <p className="text-xs text-gray-400 mt-2">sobre títulos atrasados e perdidos</p>
                            </div>
                            
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 h-48">
                                <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase">Aging de Dívida</h3>
                                <div className="space-y-2">
                                    {Object.entries(metrics.agingMap).map(([faixa, valor]) => (
                                        <div key={faixa} className="flex justify-between items-center text-sm">
                                            <span className="font-bold text-gray-500">{faixa} dias</span>
                                            <span className="font-black text-[#4A423D]">{formatCurrency(valor as number)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="text-sm font-bold text-gray-800 mb-6 uppercase">Risco de Crédito (Pagamento x Dívida)</h3>
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                            <XAxis type="number" dataKey="capacidade" name="Capacidade" tickFormatter={(v) => `R$${(v/1000)}k`} />
                                            <YAxis type="number" dataKey="divida" name="Dívida" tickFormatter={(v) => `R$${(v/1000)}k`} />
                                            <ZAxis type="category" dataKey="name" name="Cliente" />
                                            <Tooltip cursor={{strokeDasharray: '3 3'}} contentStyle={{ borderRadius: '12px' }} />
                                            <Scatter name="Clientes" data={metrics.riscoArr} fill="#EF4444" />
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="text-sm font-bold text-gray-800 mb-6 uppercase">Auditoria (Supply x Royalties)</h3>
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                            <XAxis type="number" dataKey="supply" name="Supply" tickFormatter={(v) => `R$${(v/1000)}k`} />
                                            <YAxis type="number" dataKey="royalties" name="Royalties" tickFormatter={(v) => `R$${(v/1000)}k`} />
                                            <ZAxis type="category" dataKey="name" name="Cliente" />
                                            <Tooltip cursor={{strokeDasharray: '3 3'}} contentStyle={{ borderRadius: '12px' }} />
                                            <Scatter name="Clientes" data={metrics.riscoArr} fill="#8B5CF6" />
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Aba 5: Safra */}
                {activeTab === 5 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-xs font-bold text-gray-500 uppercase">Receita Expansão (Taxa Franq)</p>
                                <p className="text-2xl font-black text-[#4A423D] mt-1">{formatCurrency(metrics.txFranquiaExp)}</p>
                            </div>
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-xs font-bold text-gray-500 uppercase">Ticket M. Novas Unidades (6m)</p>
                                <p className="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(metrics.ticketMedioNew)}</p>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 pr-8">
                            <h3 className="text-sm font-bold text-gray-800 mb-6 uppercase">Evolução de Safra (Coortes)</h3>
                            <div className="h-96">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={metrics.safraLinesData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="mesTx" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(v) => `R$${(v/1000)}k`} />
                                        <Tooltip cursor={{ stroke: '#F3F4F6', strokeWidth: 40 }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Legend iconType="circle" />
                                        {metrics.evolutionKeys.map((key, i) => (
                                            <Line key={key} type="monotone" dataKey={key} stroke={`hsl(${(i * 45) % 360}, 70%, 50%)`} strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

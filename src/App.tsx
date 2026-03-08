import React, { useState, useEffect } from 'react';
import { 
  Trophy, Filter, Wallet, Repeat, Scale, Users, BarChart, 
  Store, DollarSign, Tag, Megaphone, Award, UserPlus, Coins, Clock, TrendingUp,
  Calendar, Calculator, TrendingDown, Activity, Loader2, ArrowDown, Layout, 
  X, History, FileText, CheckCircle, ArrowRightCircle, PackageX
} from 'lucide-react';

const StatCard = ({ title, value, subtitle, trend, trendType, icon: Icon, highlight = false, tooltip, onClick }: any) => (
    <div 
        onClick={onClick}
        className={`p-6 rounded-2xl border flex flex-col justify-between transition-all duration-300 hover:shadow-lg ${highlight ? 'bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 text-white border-transparent shadow-amber-500/20' : 'bg-white border-gray-100 text-gray-800 shadow-sm'} ${onClick ? 'cursor-pointer hover:border-amber-400 hover:-translate-y-1' : ''}`} 
        title={tooltip}
    >
        <div className="flex justify-between items-start">
            <div className={`p-2.5 rounded-xl ${highlight ? 'bg-white/20 backdrop-blur-sm shadow-inner' : 'bg-amber-50 border border-amber-100/50'}`}>
                <Icon className={`w-5 h-5 ${highlight ? 'text-white' : 'text-amber-600'}`} />
            </div>
            {trend && (
                <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${highlight ? 'bg-white/10 text-amber-50' : (trendType === 'up' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}`}>
                    {trendType === 'up' ? <TrendingUp className="w-3.5 h-3.5 mr-1" /> : <TrendingDown className="w-3.5 h-3.5 mr-1" />}
                    {trend}
                </div>
            )}
        </div>
        <div className="mt-5">
            <p className={`text-sm font-semibold tracking-wide uppercase ${highlight ? 'text-amber-50' : 'text-gray-400'}`}>{title}</p>
            <h3 className="text-3xl font-extrabold mt-1 tracking-tight">{value}</h3>
            {subtitle && <p className={`text-xs mt-1.5 font-medium ${highlight ? 'text-amber-100' : 'text-gray-400'}`}>{subtitle}</p>}
        </div>
    </div>
);

const ProgressBar = ({ value, max, label }: any) => {
    const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className="w-full">
            <div className="flex justify-between text-sm mb-1.5">
                <span className="font-semibold text-gray-600">{label}</span>
                <span className="font-bold text-amber-600">{percentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 shadow-inner">
                <div className="bg-gradient-to-r from-amber-400 to-amber-600 h-2.5 rounded-full transition-all duration-1000 ease-out shadow-sm" style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

const ViewResultados = ({ apiData, formatBRL, daysInPeriod }: any) => {
    const [metaAnual, setMetaAnual] = useState(24);
    const [isVendasModalOpen, setIsVendasModalOpen] = useState(false);
    
    const realizado = apiData?.vendas?.quantidade || 0;
    const vendasAno = apiData?.vendas?.vendas_ano || 0;
    const listaVendas = apiData?.vendas?.lista || [];
    
    const receitaBruta = apiData?.contaAzul?.receitaBruta || 0;
    const taxaFranquiaMedia = apiData?.contaAzul?.taxaFranquiaMedia || 0;

    const metaMensal = (metaAnual / 12).toFixed(1);
    const metaSemanal = (metaAnual / 52).toFixed(1);
    const metaPeriodo = Math.ceil((metaAnual / 365) * daysInPeriod) || 1;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <StatCard 
                    title="Franquias Vendidas (Período)" 
                    value={realizado} 
                    trend="Ver Detalhes" 
                    trendType="up" 
                    icon={Store} 
                    highlight={true} 
                    tooltip="Clique para ver a lista de vendas do período (win=true)."
                    onClick={() => setIsVendasModalOpen(true)}
                />
                <StatCard 
                    title="Receita Bruta de Vendas" 
                    value={formatBRL(receitaBruta)} 
                    subtitle="Taxa de Franquia (Conta Azul)" 
                    icon={DollarSign} 
                    tooltip="Somatório dos valores recebidos na categoria Taxa de Franquia"
                />
                <StatCard 
                    title="Taxa de Franquia Média" 
                    value={formatBRL(taxaFranquiaMedia)} 
                    subtitle="Média por cliente" 
                    icon={Tag} 
                    tooltip="Média dos valores recebidos na categoria Taxa de Franquia"
                />
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-gray-800">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <h3 className="text-xl font-bold text-gray-800">Acompanhamento de Metas</h3>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200 shadow-sm">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2">Meta Anual:</label>
                            <input 
                                type="number" 
                                value={metaAnual} 
                                onChange={(e) => setMetaAnual(Number(e.target.value))}
                                className="w-20 bg-white text-center font-bold text-amber-600 outline-none rounded-lg border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 p-1.5 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                    <div className="space-y-8">
                        <ProgressBar value={vendasAno} max={metaAnual} label="Atingimento da Meta Anual (Ano Inteiro)" />
                        <ProgressBar value={realizado} max={metaAnual} label={`Representatividade do Período (${daysInPeriod} dias) na Meta Anual`} />
                        
                        <div className="flex gap-6 pt-6 border-t border-gray-100">
                            <div className="bg-gray-50 p-4 rounded-xl flex-1 border border-gray-100">
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">Meta Mensal</p>
                                <p className="text-2xl font-bold text-gray-700 mt-1">{metaMensal} <span className="text-sm font-medium text-gray-400">vendas</span></p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl flex-1 border border-gray-100">
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">Meta Semanal</p>
                                <p className="text-2xl font-bold text-gray-700 mt-1">{metaSemanal} <span className="text-sm font-medium text-gray-400">vendas</span></p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-8 rounded-2xl border border-amber-200/50 flex items-center justify-center flex-col text-center relative overflow-hidden shadow-inner">
                        <span className="text-xs text-amber-600 uppercase font-extrabold tracking-widest mb-2">Meta p/ Período Filtrado</span>
                        <span className="text-amber-700 font-black text-6xl drop-shadow-sm">{metaPeriodo} <span className="text-2xl font-bold opacity-80">vendas</span></span>
                        <span className="text-amber-800/70 text-sm font-medium mt-4">Você realizou {realizado} vendas neste período.</span>
                        <div className="mt-4">
                            <span className={`text-xs font-bold px-4 py-2 rounded-full shadow-sm ${realizado >= metaPeriodo ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-white text-amber-600 border border-amber-200'}`}>
                                {realizado >= metaPeriodo ? '🏆 Meta Batida!' : `Faltam ${Math.max(0, metaPeriodo - realizado)} vendas para atingir.`}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {isVendasModalOpen && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" onClick={() => setIsVendasModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden border border-gray-100" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><Store className="w-5 h-5 text-amber-600"/> Negociações Ganhas no Período</h3>
                            <button onClick={() => setIsVendasModalOpen(false)} className="p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-100 text-gray-500 transition-colors"><X className="w-4 h-4"/></button>
                        </div>
                        <div className="overflow-y-auto p-5 flex-1 bg-gray-50/30">
                            {listaVendas.length > 0 ? (
                                <div className="space-y-3">
                                    {listaVendas.map((venda: any) => (
                                        <div key={venda._id} className="p-4 bg-white border border-gray-200 rounded-xl flex justify-between items-center hover:border-amber-300 transition-colors shadow-sm">
                                            <div>
                                                <p className="font-bold text-gray-800">{venda.name}</p>
                                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> Fechamento: {new Date(venda.closed_at).toLocaleDateString('pt-BR')}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="bg-green-50 text-green-700 border border-green-100 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">Ganha</span>
                                                <p className="text-sm font-extrabold text-amber-600 mt-2">{formatBRL(venda.amount_total || 0)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4"><Store className="w-8 h-8 text-gray-300"/></div>
                                    <p className="text-gray-500 font-medium">Nenhuma venda registrada neste período.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ViewFunil = ({ apiData }: any) => {
    const steps = apiData?.funil || [];
    const maxValue = steps.reduce((max: number, s: any) => Math.max(max, s.value), 0) || 1;

    const totalVendas = apiData?.vendas?.quantidade || 0;
    const leadsTotais = apiData?.leads_totais || 1;
    const conversaoGeral = leadsTotais > 0 ? (totalVendas / leadsTotais) * 100 : 0;

    const stepsSecundario = [
        { label: 'Lead (Outros)', value: 120, color: 'bg-gray-400' },
        { label: 'Contato', value: 80, color: 'bg-amber-300' },
        { label: 'Agendados', value: 30, color: 'bg-amber-400' },
        { label: 'Reunião', value: 15, color: 'bg-amber-500' },
        { label: 'Venda', value: 3, color: 'bg-gradient-to-r from-amber-500 to-amber-600' }
    ];
    const maxSecundario = stepsSecundario[0].value;
    const convSecundaria = (stepsSecundario[4].value / stepsSecundario[0].value) * 100;

    const getBarColor = (idx: number, total: number) => {
        if (idx === total - 1) return 'bg-gradient-to-r from-amber-500 to-amber-600 shadow-md shadow-amber-500/30'; 
        if (idx >= total - 3) return 'bg-amber-500'; 
        if (idx >= total - 6) return 'bg-amber-400';
        return 'bg-gray-300';
    };

    const getConversion = (current: number, prev: number) => {
        if (prev === 0) return '0%';
        return ((current / prev) * 100).toFixed(1) + '%';
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-gray-800">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Filter className="w-5 h-5 text-amber-600" /> Funil Principal: Expansão p9
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">Canais RD Station: Agência P9 Digital (Google, Meta).</p>
                    </div>
                    
                    <div className="bg-amber-50 px-5 py-3 rounded-xl border border-amber-100 text-center min-w-[200px] shadow-sm">
                        <p className="text-xs text-amber-600/80 uppercase font-extrabold tracking-widest mb-1">Eficiência Global</p>
                        <div className="flex flex-col">
                            <span className="text-3xl font-black text-amber-700">{conversaoGeral.toFixed(2)}%</span>
                            <span className="text-[11px] font-medium text-amber-600/70 mt-1">{totalVendas} vendas / {leadsTotais} leads</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-col gap-6"> 
                    {steps.map((step: any, idx: number) => (
                        <div key={idx} className="relative">
                            <div className="flex items-center gap-4">
                                <div className="w-48 text-right font-semibold text-gray-600 text-xs md:text-sm truncate" title={step.label}>
                                    {idx + 1}. {step.label}
                                </div>
                                <div className="flex-1 h-10 bg-gray-50 rounded-r-xl relative overflow-visible flex items-center border border-gray-100 shadow-inner">
                                    {step.value > 0 ? (
                                        <div 
                                            className={`h-full ${getBarColor(idx, steps.length)} rounded-r-xl flex items-center px-4 text-white font-bold text-xs transition-all duration-1000 ease-out`} 
                                            style={{ width: `${(step.value / maxValue) * 100}%` }} 
                                        >
                                            {step.value}
                                        </div>
                                    ) : (
                                        <span className="ml-3 text-xs text-gray-400 font-bold">0</span>
                                    )}
                                </div>
                            </div>
                            
                            {idx > 0 && (
                                <div className="absolute top-[-14px] left-[210px] md:left-[210px] z-10">
                                    <div className="flex items-center gap-1 bg-white px-2 py-1 border border-gray-200 rounded-lg shadow-sm text-[10px] font-bold text-amber-600">
                                        <ArrowDown className="w-3 h-3 text-amber-400" />
                                        {getConversion(step.value, steps[idx-1].value)}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-gray-800 relative group">
                <div className="absolute inset-0 bg-gray-50/50 backdrop-blur-[1px] z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                    <span className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold shadow-lg">Valores Fictícios - Em desenvolvimento</span>
                </div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Filter className="w-5 h-5 text-gray-400" /> Funil Secundário: Outros Canais
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">Canais: IAMAC, Orgânico, Indicação, Assessoria, Feiras.</p>
                    </div>
                    
                    <div className="bg-gray-50 px-5 py-3 rounded-xl border border-gray-200 text-center min-w-[200px] shadow-sm">
                        <p className="text-xs text-gray-500 uppercase font-extrabold tracking-widest mb-1">Eficiência Global</p>
                        <div className="flex flex-col">
                            <span className="text-3xl font-black text-gray-800">{convSecundaria.toFixed(2)}%</span>
                            <span className="text-[11px] font-medium text-gray-500 mt-1">{stepsSecundario[4].value} vendas / {stepsSecundario[0].value} leads</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-col gap-6"> 
                    {stepsSecundario.map((step: any, idx: number) => (
                        <div key={idx} className="relative">
                            <div className="flex items-center gap-4">
                                <div className="w-48 text-right font-semibold text-gray-600 text-xs md:text-sm truncate">
                                    {step.label}
                                </div>
                                <div className="flex-1 h-10 bg-gray-50 rounded-r-xl relative overflow-visible flex items-center border border-gray-100 shadow-inner">
                                    <div 
                                        className={`h-full ${step.color} rounded-r-xl flex items-center px-4 text-white font-bold text-xs`} 
                                        style={{ width: `${(step.value / maxSecundario) * 100}%` }} 
                                    >
                                        {step.value}
                                    </div>
                                </div>
                            </div>
                            
                            {idx > 0 && (
                                <div className="absolute top-[-14px] left-[210px] md:left-[210px] z-10">
                                    <div className="flex items-center gap-1 bg-white px-2 py-1 border border-gray-200 rounded-lg shadow-sm text-[10px] font-bold text-gray-500">
                                        <ArrowDown className="w-3 h-3 text-gray-400" />
                                        {getConversion(step.value, stepsSecundario[idx-1].value)}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ViewCAC = ({ apiData, formatBRL }: any) => {
    const investimentoMkt = apiData?.contaAzul?.investimentoMkt || 0;
    const custoAgencia = apiData?.contaAzul?.custoAgencia || 0;
    const custosIndiretos = 0;
    const comissoes = apiData?.contaAzul?.comissoes || 0;
    const custoTotal = investimentoMkt + custoAgencia + custosIndiretos + comissoes;
    
    const vendasReais = apiData?.vendas?.quantidade || 0;
    const cacReal = vendasReais > 0 ? custoTotal / vendasReais : 0;

    return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-2">
                <StatCard title="Investimento Mkt" value={formatBRL(investimentoMkt)} icon={Megaphone} />
                <div className="text-[10px] text-gray-500 flex justify-between px-2">
                    <span>Meta: {formatBRL(apiData?.contaAzul?.mktFacebook || 0)}</span>
                    <span>Google: {formatBRL(apiData?.contaAzul?.mktGoogle || 0)}</span>
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <StatCard title="Agência de Marketing" value={formatBRL(custoAgencia)} icon={Users} subtitle="Custo fixo agência" />
                <div className="text-[10px] text-gray-500 flex justify-between px-2">
                    <span>P9: {formatBRL(apiData?.contaAzul?.agenciaP9 || 0)}</span>
                    <span>B&L: {formatBRL(apiData?.contaAzul?.agenciaBEL || 0)}</span>
                </div>
            </div>
            <StatCard title="Custos Indiretos" value={formatBRL(custosIndiretos)} icon={PackageX} subtitle="Eventos, softwares, etc." />
            <StatCard title="Comissões" value={formatBRL(comissoes)} icon={Award} />
        </div>
        <div className="bg-white p-10 rounded-2xl border border-amber-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
                <h3 className="text-gray-500 font-extrabold uppercase tracking-widest text-sm">CAC Total por Franquia</h3>
                <p className="text-xs text-gray-400 mt-2 font-medium">(Mkt + Agência + Indiretos + Comissões) ÷ <strong className="text-amber-600">{vendasReais} Vendas</strong></p>
            </div>
            <div className="text-right">
                <h2 className="text-5xl font-black text-amber-600 drop-shadow-sm">{formatBRL(cacReal)}</h2>
                <p className="text-sm text-amber-700/70 font-bold uppercase tracking-widest mt-2">Custo de Aquisição Real</p>
            </div>
        </div>
    </div>
)};

const ViewLTV = ({ apiData, formatBRL }: any) => {
    const mediaRoyaltiesMensal = apiData?.contaAzul?.mediaRoyaltiesMensal || 0;
    const faturamentoMedio = mediaRoyaltiesMensal / 0.06;
    
    const prazoContrato = 60;
    const churn = 0.05;
    const tempoMedio = prazoContrato * (1 - churn); 
    
    const ltv = mediaRoyaltiesMensal * tempoMedio;

    return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard 
                title="Faturamento Médio" 
                value={formatBRL(faturamentoMedio)} 
                subtitle="Royalties / 6%" 
                icon={Coins} 
            />
            <StatCard 
                title="Royalties Médio/Mês" 
                value={formatBRL(mediaRoyaltiesMensal)} 
                subtitle="Média por cliente" 
                icon={Coins} 
            />
            <StatCard 
                title="Tempo Médio Estimado" 
                value={`${tempoMedio.toFixed(0)} meses`} 
                subtitle="Contrato 60m (-5% churn)" 
                icon={Clock} 
            />
            <StatCard 
                title="LTV Médio (Royalties)" 
                value={formatBRL(ltv)} 
                subtitle="Royalties x Tempo" 
                icon={TrendingUp} 
                highlight={true} 
            />
        </div>
    </div>
)};

const ViewUnitEconomics = ({ apiData, formatBRL }: any) => {
    const mediaRoyaltiesMensal = apiData?.contaAzul?.mediaRoyaltiesMensal || 0;
    const taxaFranquiaMedia = apiData?.contaAzul?.taxaFranquiaMedia || 0;
    const receitaMensalMedia = mediaRoyaltiesMensal;
    const tempoMedio = 60 * (1 - 0.05);
    
    const ltv = (mediaRoyaltiesMensal * tempoMedio) + taxaFranquiaMedia;
    
    const investimentoMkt = apiData?.contaAzul?.investimentoMkt || 0;
    const custoAgencia = apiData?.contaAzul?.custoAgencia || 0;
    const comissoes = apiData?.contaAzul?.comissoes || 0;
    const custoTotal = investimentoMkt + custoAgencia + comissoes;
    const vendasReais = apiData?.vendas?.quantidade || 0;
    const cac = vendasReais > 0 ? custoTotal / vendasReais : 0;
    
    const ratio = cac > 0 ? (ltv / cac).toFixed(1) : 0;
    const payback = receitaMensalMedia > 0 ? (cac / receitaMensalMedia).toFixed(1) : 0;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <h3 className="text-2xl font-bold text-gray-800">Saúde Financeira da Expansão</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <StatCard title="LTV Médio Total" value={formatBRL(ltv)} subtitle="(Royalties x Tempo) + Taxa" icon={TrendingUp} highlight />
                <StatCard title="CAC" value={formatBRL(cac)} subtitle="Custo de Aquisição" icon={TrendingDown} />
                <StatCard title="Receita Mensal Média" value={formatBRL(receitaMensalMedia)} subtitle="Apenas Royalties" icon={DollarSign} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden text-gray-800 group hover:border-amber-200 transition-colors">
                    <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity"><Scale className="w-48 h-48" /></div>
                    <h4 className="text-xs font-extrabold text-gray-400 tracking-widest uppercase">LTV / CAC Ratio</h4>
                    <div className="mt-4 flex items-end gap-2 relative z-10">
                        <span className="text-6xl font-black text-amber-600 drop-shadow-sm">{ratio}x</span>
                    </div>
                    <div className="mt-6 pt-6 border-t border-gray-100 relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`w-3 h-3 rounded-full shadow-sm ${Number(ratio) >= 3 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            <span className="text-sm font-bold text-gray-700">Status: {Number(ratio) >= 3 ? 'Saudável' : 'Atenção'}</span>
                        </div>
                        <p className="text-xs text-gray-400 font-medium">Referência de mercado: ≥ 3x</p>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden text-gray-800 group hover:border-amber-200 transition-colors">
                    <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity"><Calendar className="w-48 h-48" /></div>
                    <h4 className="text-xs font-extrabold text-gray-400 tracking-widest uppercase">Payback do CAC</h4>
                    <div className="mt-4 flex items-end gap-2 relative z-10">
                        <span className="text-6xl font-black text-amber-600 drop-shadow-sm">{payback}</span>
                        <span className="text-xl font-bold text-gray-400 mb-2">meses</span>
                    </div>
                    <div className="mt-6 pt-6 border-t border-gray-100 relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`w-3 h-3 rounded-full shadow-sm ${Number(payback) <= 12 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            <span className="text-sm font-bold text-gray-700">Status: {Number(payback) <= 12 ? 'Excelente' : 'Lento'}</span>
                        </div>
                        <p className="text-xs text-gray-400 font-medium">Referência de mercado: ≤ 12 meses</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ViewTime = ({ apiData }: any) => {
    const vendedoresData = apiData?.time ? Object.entries(apiData.time) : [];

    vendedoresData.sort((a: any, b: any) => b[1].vendas - a[1].vendas);

    const vendedoresProcessados = vendedoresData.map(([nome, dados]: any) => {
        const vendas = dados.vendas; 
        const leads = dados.leads;

        let fechamento = 0;
        if (leads > 0 && vendas <= leads) {
            fechamento = (vendas / leads) * 100;
        } else if (vendas > leads) {
            fechamento = -1; 
        }

        return { nome, vendas, leads, fechamento };
    });

    return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-gray-800">
        <div className="p-8 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-xl font-bold text-gray-800">Performance por Vendedor</h3>
            <p className="text-xs text-gray-500 mt-2 font-medium">
                * A taxa de fechamento é calculada considerando as vendas do período divididas pelo <strong>total de leads criados (inclusive descartados)</strong> atribuídos ao vendedor no período filtrado.
            </p>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-white text-gray-400 font-extrabold uppercase text-xs tracking-wider border-b border-gray-100">
                    <tr>
                        <th className="p-5">Vendedor</th>
                        <th className="p-5 text-center">Vendas (Período)</th>
                        <th className="p-5 text-center">Leads Criados (Período)</th>
                        <th className="p-5 text-center">Taxa de Fechamento</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {vendedoresProcessados.length > 0 ? vendedoresProcessados.map((v: any, idx: number) => (
                        <tr key={idx} className="hover:bg-amber-50/30 transition-colors group">
                            <td className="p-5 font-bold text-gray-800 group-hover:text-amber-700 transition-colors">{v.nome}</td>
                            <td className="p-5 text-center"><span className="bg-amber-50 text-amber-700 border border-amber-100 py-1.5 px-3.5 rounded-full font-black shadow-sm">{v.vendas}</span></td>
                            <td className="p-5 text-center font-medium text-gray-600">{v.leads}</td>
                            <td className="p-5 text-center font-black text-amber-600">
                                {v.fechamento === -1 ? <span className="text-xs text-gray-300 font-semibold uppercase tracking-wider" title="Vendeu leads criados antes deste período">N/A</span> : `${v.fechamento.toFixed(2)}%`}
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan={4} className="p-8 text-center text-gray-400 font-medium">Nenhum dado de equipe encontrado.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
)};

const ViewPipeline = ({ apiData, formatBRL }: any) => {
    const [selectedDeal, setSelectedDeal] = useState<any>(null);
    const [timelineData, setTimelineData] = useState<any[]>([]);
    const [loadingTimeline, setLoadingTimeline] = useState(false);

    const leadsAtivos = apiData ? apiData.leads_ativos : 0;
    
    const totalVendas = apiData?.vendas?.quantidade || 0;
    const leadsTotais = apiData?.leads_totais || 1; 
    const receitaBruta = apiData?.contaAzul?.receitaBruta || 0;
    
    const taxaConversao = leadsTotais > 0 ? (totalVendas / leadsTotais) : 0;
    const forecast = Math.round(leadsAtivos * taxaConversao);
    
    const ticketMedioBruto = totalVendas > 0 ? receitaBruta / totalVendas : 0;
    const pipelinePonderado = forecast * ticketMedioBruto;

    const kanbanDeals = apiData?.kanban || {};
    const columns = apiData?.funil ? 
        apiData.funil.filter((s: any) => s.label && !s.label.includes('Contrato')) : [];

    const fixEncoding = (text: string) => {
        if (!text) return text;
        try {
            return decodeURIComponent(escape(text));
        } catch (e) {
            return text;
        }
    };

    const openDealHistory = async (deal: any) => {
        setSelectedDeal(deal);
        setLoadingTimeline(true);
        setTimelineData([]);
        
        try {
            const res = await fetch(`/api/rd-crm?deal_id=${deal.id}`);
            const data = await res.json();
            if(data.success) {
                setTimelineData(data.timeline);
            }
        } catch (error) {
            console.error("Erro ao buscar timeline", error);
        } finally {
            setLoadingTimeline(false);
        }
    };

    return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard 
                title="Pipeline Ativo" 
                value={leadsAtivos} 
                subtitle="Negociações ativas (Win=Null)" 
                icon={Activity} 
                tooltip="Origem: Leads em aberto no RD."
            />
            <StatCard 
                title="Pipeline Ponderado" 
                value={formatBRL(pipelinePonderado)} 
                subtitle="Forecast x Ticket Médio" 
                icon={Calculator} 
                highlight={true} 
                tooltip="Cálculo: (Leads Ativos x Taxa de Conversão) x Ticket Médio"
            />
            <StatCard 
                title="Forecast 30 dias" 
                value={`${forecast} Vendas`} 
                subtitle="Ativos x Taxa de Conversão" 
                icon={Calendar} 
                tooltip="Cálculo: Leads Ativos x (Vendas / Leads Totais Históricos)"
            />
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Layout className="w-5 h-5 text-amber-600"/> Kanban Simplificado (Leads Ativos)
            </h3>
            <div className="flex overflow-x-auto pb-6 gap-4 snap-x">
                {columns.map((col: any) => {
                    const cards = kanbanDeals[col.id] || [];
                    return (
                        <div key={col.id} className="min-w-[280px] w-[280px] flex-shrink-0 bg-gray-50/80 rounded-xl p-3 border border-gray-200 snap-center">
                            <div className="flex justify-between items-center mb-4 px-1">
                                <h4 className="font-extrabold text-sm text-gray-700 truncate tracking-wide" title={col.label}>{col.label}</h4>
                                <span className="text-xs bg-white px-2 py-1 rounded-md border border-gray-200 text-gray-500 font-bold shadow-sm">{cards.length}</span>
                            </div>
                            
                            <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto pr-1 pb-2 custom-scrollbar">
                                {cards.length > 0 ? cards.map((deal: any) => (
                                    <div 
                                        key={deal.id} 
                                        onClick={() => openDealHistory(deal)}
                                        className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-amber-400 hover:-translate-y-0.5 group"
                                    >
                                        <p className="text-sm font-bold text-gray-800 line-clamp-2 group-hover:text-amber-700 transition-colors">{deal.name}</p>
                                        <div className="flex justify-between items-end mt-3">
                                            <span className="text-xs text-gray-400 font-medium truncate max-w-[110px] bg-gray-50 px-2 py-1 rounded">{deal.user || 'Sem dono'}</span>
                                            {deal.value > 0 && <span className="text-xs font-black text-amber-600">{formatBRL(deal.value)}</span>}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-6 text-xs text-gray-400 font-medium border-2 border-dashed border-gray-200 rounded-xl">Nenhum lead nesta etapa</div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>

        {selectedDeal && (
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex justify-end z-50 animate-in fade-in duration-200" onClick={() => setSelectedDeal(null)}>
                <div 
                    className="w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 border-l border-gray-200"
                    onClick={(e) => e.stopPropagation()} 
                >
                    <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-white sticky top-0 z-10 shadow-sm">
                        <div>
                            <h2 className="text-xl font-black text-gray-900 leading-tight">{selectedDeal.name}</h2>
                            <p className="text-xs text-amber-600 font-bold mt-2 uppercase tracking-widest flex items-center gap-1"><UserPlus className="w-3 h-3"/> Responsável: {selectedDeal.user}</p>
                        </div>
                        <button onClick={() => setSelectedDeal(null)} className="p-2 bg-gray-50 rounded-full border border-gray-200 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-all">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    
                    <div className="p-8">
                        <h3 className="text-xs font-extrabold uppercase text-gray-400 tracking-widest mb-8 flex items-center gap-2">
                            <History className="w-4 h-4"/> Histórico de Eventos
                        </h3>
                        
                        {loadingTimeline ? (
                            <div className="flex flex-col items-center gap-4 text-amber-600 justify-center py-12">
                                <Loader2 className="animate-spin w-8 h-8"/> 
                                <span className="text-sm font-bold">Carregando timeline do RD...</span>
                            </div>
                        ) : (
                            <div className="relative border-l-2 border-gray-100 ml-4 space-y-10">
                                {timelineData.length > 0 ? timelineData.map((item, idx) => (
                                    <div key={idx} className="relative pl-8">
                                        <div className="absolute -left-[15px] top-1 bg-white border-4 border-white rounded-full p-1 shadow-sm ring-1 ring-gray-100">
                                            {item.type === 'anotacao' && <FileText className="w-4 h-4 text-blue-500" />}
                                            {item.type === 'tarefa' && <CheckCircle className="w-4 h-4 text-green-500" />}
                                            {item.type === 'criacao' && <ArrowRightCircle className="w-4 h-4 text-gray-400" />}
                                            {item.type === 'fechamento' && <Trophy className="w-4 h-4 text-amber-500" />}
                                        </div>
                                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-amber-200 transition-colors group">
                                            <p className="text-[10px] font-extrabold text-gray-400 mb-2 uppercase tracking-wider">{new Date(item.date).toLocaleString('pt-BR')}</p>
                                            <p className="text-sm text-gray-700 leading-relaxed"><strong className="text-gray-900">{fixEncoding(item.title)}:</strong> {fixEncoding(item.desc)}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-sm font-medium text-gray-400 ml-8">Nenhum evento encontrado.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
)};

export default function App() {
    const [activeTab, setActiveTab] = useState('Resultado');
    const [apiData, setApiData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [daysInPeriod, setDaysInPeriod] = useState(30);
    const [activePreset, setActivePreset] = useState('allTime');
    
    const todayStr = new Date().toISOString().split('T')[0];

    const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

    useEffect(() => {
        if(startDate && endDate) {
            const start = new Date(`${startDate}T00:00:00`);
            const end = new Date(`${endDate}T23:59:59`);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setDaysInPeriod(diffDays || 1);
        }
    }, [startDate, endDate]);

    const setDatePreset = (preset: string) => {
        setActivePreset(preset);
        const now = new Date();
        let start = new Date();
        let end = new Date();

        if (preset === 'currentMonth') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (preset === 'prevMonth') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
        } else if (preset === 'dez1') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth(), 10);
        } else if (preset === 'dez2') {
            start = new Date(now.getFullYear(), now.getMonth(), 11);
            end = new Date(now.getFullYear(), now.getMonth(), 20);
        } else if (preset === 'dez3') {
            start = new Date(now.getFullYear(), now.getMonth(), 21);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (preset === 'allTime') {
            start = new Date(now.getFullYear() - 1, 0, 1); 
            end = now;
        }

        const formatDate = (date: Date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };
        
        setStartDate(formatDate(start));
        setEndDate(formatDate(end));
    };

    useEffect(() => {
        setDatePreset('allTime');
    }, []);

    useEffect(() => {
        async function fetchData() {
            if (!startDate || !endDate) return;
            setLoading(true);
            try {
                const response = await fetch(`/api/dashboard?startDate=${startDate}&endDate=${endDate}`);
                const result = await response.json();
                if (result.success) {
                    setApiData(result.dados);
                }
            } catch (error) {
                console.error("Erro ao buscar dados", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [startDate, endDate]); 

    const tabs = [
        { id: 'Resultado', icon: Trophy },
        { id: 'Funil', icon: Filter },
        { id: 'CAC', icon: Wallet },
        { id: 'LTV', icon: Repeat },
        { id: 'Unit Eco', icon: Scale },
        { id: 'Time', icon: Users },
        { id: 'Pipeline', icon: BarChart },
    ];

    const renderContent = () => {
        if (loading && !apiData) {
            return (
                <div className="flex flex-col justify-center items-center h-[50vh] text-amber-600 gap-4">
                    <Loader2 className="animate-spin w-10 h-10" /> 
                    <p className="font-bold tracking-widest uppercase text-sm">Sincronizando dados...</p>
                </div>
            );
        }

        switch(activeTab) {
            case 'Resultado': return <ViewResultados apiData={apiData} formatBRL={formatBRL} daysInPeriod={daysInPeriod} />;
            case 'Funil': return <ViewFunil apiData={apiData} />;
            case 'CAC': return <ViewCAC apiData={apiData} formatBRL={formatBRL} />;
            case 'LTV': return <ViewLTV apiData={apiData} formatBRL={formatBRL} />;
            case 'Unit Eco': return <ViewUnitEconomics apiData={apiData} formatBRL={formatBRL} />;
            case 'Time': return <ViewTime apiData={apiData} formatBRL={formatBRL} />;
            case 'Pipeline': return <ViewPipeline apiData={apiData} formatBRL={formatBRL} />;
            default: return <ViewResultados apiData={apiData} formatBRL={formatBRL} daysInPeriod={daysInPeriod} />;
        }
    };

    const getBtnStyle = (preset: string) => {
        return activePreset === preset 
            ? "text-[11px] bg-white text-amber-600 font-extrabold px-4 py-2 rounded-xl border-2 border-amber-400 shadow-md shadow-amber-500/10 whitespace-nowrap transition-all uppercase tracking-wider"
            : "text-[11px] bg-white text-gray-500 hover:text-gray-800 hover:bg-gray-50 font-bold px-4 py-2 rounded-xl border border-gray-200 whitespace-nowrap transition-colors uppercase tracking-wider shadow-sm hover:border-amber-200";
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] p-4 md:p-8 w-full font-sans selection:bg-amber-100 selection:text-amber-900">
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #fcd34d; border-radius: 20px; }
                .hide-scroll::-webkit-scrollbar { display: none; }
            `}</style>
            
            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
                <div className="flex items-center gap-4 w-full xl:w-auto">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-amber-600/30 text-2xl border border-amber-400/50">
                        B
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-gray-900">EXPANSÃO</h1>
                        <p className="text-[10px] text-amber-600 font-extrabold uppercase tracking-[0.2em]">Painel de Controle Estratégico</p>
                    </div>
                </div>
                
                <div className="w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0">
                    <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 min-w-max">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                                    activeTab === tab.id 
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20 translate-y-[1px]' 
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-amber-700'
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.id}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-8 flex flex-col md:flex-row gap-6 items-center justify-between">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="bg-amber-50 p-2 rounded-lg"><Calendar className="w-5 h-5 text-amber-600" /></div>
                    <input 
                        type="date" 
                        value={startDate} 
                        max={todayStr}
                        onChange={(e) => { setStartDate(e.target.value); setActivePreset(''); }}
                        className="bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 block p-2 outline-none shadow-sm transition-all" 
                    />
                    <span className="text-gray-400 font-medium text-sm">até</span>
                    <input 
                        type="date" 
                        value={endDate} 
                        max={todayStr}
                        onChange={(e) => { setEndDate(e.target.value); setActivePreset(''); }}
                        className="bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 block p-2 outline-none shadow-sm transition-all" 
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scroll">
                    <button onClick={() => setDatePreset('allTime')} className={getBtnStyle('allTime')}>Período Total</button>
                    <button onClick={() => setDatePreset('currentMonth')} className={getBtnStyle('currentMonth')}>Mês Atual</button>
                    <button onClick={() => setDatePreset('prevMonth')} className={getBtnStyle('prevMonth')}>Mês Anterior</button>
                    <button onClick={() => setDatePreset('dez1')} className={getBtnStyle('dez1')}>1ª Dezena</button>
                    <button onClick={() => setDatePreset('dez2')} className={getBtnStyle('dez2')}>2ª Dezena</button>
                    <button onClick={() => setDatePreset('dez3')} className={getBtnStyle('dez3')}>3ª Dezena</button>
                </div>
            </div>

            <main className="pb-10">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">{activeTab}</h2>
                        <p className="text-sm font-medium text-gray-400 mt-1 uppercase tracking-widest">Métricas e performance em tempo real</p>
                    </div>
                    {loading && <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />}
                </div>
                {renderContent()}
            </main>
        </div>
    );
}

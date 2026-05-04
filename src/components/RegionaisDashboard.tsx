import React, { useState } from 'react';
import { 
  Trophy, Filter, Wallet, Repeat, Scale, Users, BarChart, 
  Store, DollarSign, Tag, Megaphone, Award, UserPlus, Coins, Clock, TrendingUp,
  Calendar as CalendarIcon, Calculator, TrendingDown, Activity, Loader2, ArrowDown, Layout, 
  X, History, FileText, CheckCircle, ArrowRightCircle, PackageX, LogIn, Terminal, Bug, User, LogOut, HelpCircle, ArrowLeft, RefreshCw, MessageSquare
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar, Legend, PieChart, Pie, Cell, ComposedChart, ScatterChart, Scatter, ZAxis } from 'recharts';

// Helper component for Stat Cards
const StatCard = ({ title, value, subtitle, trend, trendType, icon: Icon, highlight = false }: any) => (
    <div className={`p-6 rounded-2xl border flex flex-col justify-between transition-all duration-300 hover:shadow-lg ${highlight ? 'bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 text-white border-transparent shadow-amber-500/20' : 'bg-white border-gray-100 text-gray-800 shadow-sm'}`}>
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

const RegionaisDashboard = ({ user, onBack, onLogout }: any) => {
    const [activeTab, setActiveTab] = useState('Resumo Executivo');
    const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
    const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
    const [periodPreset, setPeriodPreset] = useState('Ultimos 7 dias');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showChat, setShowChat] = useState(false);

    const tabs = [
        { id: 'Resumo Executivo', icon: Layout },
        { id: 'Marketing & Aquisição', icon: Megaphone },
        { id: 'Comercial & Vendas', icon: Wallet },
        { id: 'Operacional & Agenda', icon: CalendarIcon },
        { id: 'Financeiro & Fluxo de Caixa', icon: DollarSign },
        { id: 'Portfólio & Rentabilidade', icon: FileText },
    ];

    if (user.toLowerCase() === 'bruno' || user.toLowerCase() === 'admin' || user.toLowerCase() === 'brunoallan004') {
        tabs.push({ id: 'Debug e Operações', icon: Terminal });
    }

    const handleRefresh = async () => {
        setIsRefreshing(true);
        // Simulate data fetch
        setTimeout(() => {
            setIsRefreshing(false);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] p-4 md:p-8 w-full font-sans selection:bg-amber-100 selection:text-amber-900">
            <div className="max-w-[1600px] mx-auto w-full">
            {/* Header */}
            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
                <div className="flex items-center gap-4 w-full xl:w-auto">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-amber-600/30 border border-amber-400/50 overflow-hidden shrink-0">
                        <img src="https://caase.com.br/uploads/agreements/filename/image_7376bc2cbd1d570e.png" alt="Logo" className="w-full h-full object-contain p-1.5" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-gray-900 leading-none mb-1">REGIONAIS</h1>
                        <p className="text-[10px] text-amber-600 font-extrabold uppercase tracking-[0.2em] leading-none">Painel de Controle Estratégico</p>
                    </div>
                </div>
                
                <div className="w-full xl:w-auto mt-4 xl:mt-0">
                    <div className="flex flex-wrap items-center justify-start xl:justify-end gap-4 md:gap-6">
                        {tabs.map((tab) => {
                            const shortName = tab.id.split(' & ')[0].split(' e ')[0];
                            return (
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
                                    <span>{shortName}</span>
                                </button>
                            );
                        })}
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

            {/* Filters */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-8 flex flex-col md:flex-row gap-6 items-center justify-between">
                <div className="flex items-center gap-3 w-full md:w-auto flex-wrap md:flex-nowrap">
                    <div className="bg-amber-50 p-2 rounded-lg hidden md:block"><Filter className="w-5 h-5 text-amber-600" /></div>
                    
                    <div className="flex items-center gap-2 min-w-max">
                        <strong className="text-xs font-bold text-gray-400 uppercase tracking-wider">Regiões:</strong>
                        <select className="bg-white border border-gray-200 rounded-lg p-2 text-sm font-bold text-gray-700 outline-none hover:border-amber-400 focus:border-amber-400 transition-all shadow-sm">
                            <option>Todas as Regiões</option>
                            <option>Sudeste</option>
                            <option>Sul</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 min-w-max">
                        <strong className="text-xs font-bold text-gray-400 uppercase tracking-wider">Unidades:</strong>
                        <select className="bg-white border border-gray-200 rounded-lg p-2 text-sm font-bold text-gray-700 outline-none hover:border-amber-400 focus:border-amber-400 transition-all shadow-sm">
                            <option>Todas as Unidades</option>
                            <option>Clínica SP</option>
                            <option>Clínica RJ</option>
                        </select>
                    </div>

                    <button 
                        onClick={handleRefresh}
                        className="flex items-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all hover:bg-emerald-100 ml-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? 'Sincronizando' : 'Sincronizar'}
                    </button>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-start md:justify-end overflow-x-auto pb-2 md:pb-0 hide-scroll">
                    {['Hoje', 'Últimos 7 dias', 'Últimos 10 dias', 'Mês Atual', 'Personalizado'].map(period => (
                        <button 
                            key={period}
                            onClick={() => setPeriodPreset(period)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap min-w-max ${
                                periodPreset === period 
                                    ? 'border-2 border-amber-400 text-amber-600 shadow-sm' 
                                    : 'border border-gray-100 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                            }`}
                        >
                            {period.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="animate-in fade-in duration-500">
                {activeTab === 'Resumo Executivo' && <TabResumo />}
                {activeTab === 'Marketing & Aquisição' && <TabMarketing />}
                {activeTab === 'Comercial & Vendas' && <TabComercial />}
                {activeTab === 'Operacional & Agenda' && <TabOperacional />}
                {activeTab === 'Financeiro & Fluxo de Caixa' && <TabFinanceiro />}
                {activeTab === 'Portfólio & Rentabilidade' && <TabPortfolio />}
                {activeTab === 'Debug e Operações' && <TabDebug />}
            </div>
            </div>

            {/* AI Assistant FAB */}
            <div className="fixed bottom-6 right-6 z-50">
                <button 
                    onClick={() => setShowChat(!showChat)}
                    className="w-14 h-14 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
                >
                    {showChat ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                </button>
                {showChat && <AssistantChat onClose={() => setShowChat(false)} />}
            </div>
        </div>
    );
};

// --- Mocked Tabs ---

const TabResumo = () => {
    const evolucaoFaturamento = [
        { date: '01/05', faturamento: 12500, meta: 10000 },
        { date: '02/05', faturamento: 15300, meta: 10000 },
        { date: '03/05', faturamento: 9400,  meta: 10000 },
        { date: '04/05', faturamento: 18200, meta: 10000 },
        { date: '05/05', faturamento: 22100, meta: 10000 },
        { date: '06/05', faturamento: 16500, meta: 10000 },
        { date: '07/05', faturamento: 28400, meta: 10000 },
    ];

    const funilData = [
        { stage: 'Leads', value: 1200 },
        { stage: 'Comparecimentos', value: 450 },
        { stage: 'Agendamentos', value: 310 },
        { stage: 'Vendas', value: 85 },
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-800">Resumo Executivo</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Faturamento Total" value="R$ 122.400" subtitle="vs R$ 110.000 mês anterior" trend="11%" trendType="up" icon={DollarSign} highlight={true} />
                <StatCard title="Vendas Totais" value="85" subtitle="Fechamentos" trend="2%" trendType="up" icon={Store} />
                <StatCard title="Tícket Médio" value="R$ 1.440" subtitle="Gasto médio por cliente" trend="-1%" trendType="down" icon={Tag} />
                <StatCard title="CAC" value="R$ 380" subtitle="Custo de Aquisição de Cliente" trend="-5%" trendType="up" icon={Users} />
                <StatCard title="Fat. Médio Unid." value="R$ 61.200" subtitle="Arrecadado por filial" trend="8%" trendType="up" icon={Store} />
                <StatCard title="Lucro Médio Global" value="22%" subtitle="Margem extraída por procedimento" trend="1%" trendType="up" icon={TrendingUp} />
                <StatCard title="Ocupação Geral" value="68%" subtitle="Agenda comprometida" trend="4%" trendType="up" icon={CalendarIcon} />
                <StatCard title="Meta Alcançada" value="82%" subtitle="Frente a meta estipulada" trend="12%" trendType="up" icon={Trophy} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Evolução do Faturamento</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={evolucaoFaturamento}>
                                <defs>
                                    <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} tickFormatter={(val) => `R$ ${val/1000}k`} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <RechartsTooltip 
                                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                <Area type="monotone" dataKey="faturamento" name="Faturamento Realizado" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorFaturamento)" />
                                <Area type="step" dataKey="meta" name="Linha da Meta Diária" stroke="#9ca3af" strokeWidth={2} strokeDasharray="5 5" fill="none" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Funil de Conversão</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={funilData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="stage" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#4b5563', fontWeight: 600}} />
                                <RechartsTooltip 
                                    cursor={{fill: '#f3f4f6'}}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="value" name="Volume Absoluto" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={32} />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

const COLORS = ['#f59e0b', '#d97706', '#fbbf24', '#fcd34d', '#fef3c7'];

const TabMarketing = () => {
    const leadsOrigem = [
        { name: 'Tráfego Pago', value: 850 },
        { name: 'Busca Orgânica', value: 200 },
        { name: 'Indicação', value: 100 },
        { name: 'Mídias Sociais', value: 50 },
    ];

    const faturamentoOrigem = [
        { name: 'Tráfego Pago', value: 80000 },
        { name: 'Indicação', value: 25000 },
        { name: 'Busca Orgânica', value: 12000 },
        { name: 'Mídias Sociais', value: 5400 },
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-800">Marketing & Aquisição</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard title="Total de Leads" value="1.200" subtitle="Período" trend="5%" trendType="up" icon={Users} highlight={true} />
                <StatCard title="CPL Médio Geral" value="R$ 15,20" subtitle="Custo Ponderado" trend="-2%" trendType="down" icon={Tag} />
                <StatCard title="CPL Médio Aberto" value="R$ 18,50" subtitle="(Tráfego Pago)" trend="1%" trendType="up" icon={Tag} />
                <StatCard title="Custo Marketing" value="R$ 18.240" subtitle="Gasto corrente" trend="0%" icon={DollarSign} />
                <StatCard title="ROAS Global" value="6.7x" subtitle="Retorno sobre AdSpend" trend="0.2x" trendType="up" icon={TrendingUp} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center justify-center">Leads por Origem</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={leadsOrigem} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                    {leadsOrigem.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip 
                                    formatter={(value: number) => [value, 'Leads']}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center justify-center">Faturamento por Origem</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={faturamentoOrigem} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                    {faturamentoOrigem.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip 
                                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Faturamento']}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TabComercial = () => {
    const ticketTipo = [
        { name: 'Novos Clientes', value: 55000 },
        { name: 'Recorrências', value: 35000 },
        { name: 'Recompras', value: 32400 },
    ];

    const rankingUnidades = [
        { id: 1, name: 'Clínica SP - Paulista', faturamento: 45000, vendas: 32, ticket: 1406 },
        { id: 2, name: 'Clínica RJ - Barra', faturamento: 38200, vendas: 28, ticket: 1364 },
        { id: 3, name: 'Clínica MG - Savassi', faturamento: 25000, vendas: 15, ticket: 1666 },
        { id: 4, name: 'Clínica PR - Batel', faturamento: 14200, vendas: 10, ticket: 1420 },
    ];

    const atingimentoUnidades = [
        { id: 1, name: 'Clínica SP - Paulista', realizado: 45000, meta: 50000, crescimento: -10 },
        { id: 2, name: 'Clínica RJ - Barra', realizado: 38200, meta: 35000, crescimento: 9.1 },
        { id: 3, name: 'Clínica MG - Savassi', realizado: 25000, meta: 22000, crescimento: 13.6 },
    ];

    const acompanhamentoFunil = [
        { etapa: 'Leads Captados', realizado: 1200, meta: 1500, status: 'Abaixo', progresso: 80 },
        { etapa: 'Agendamentos', realizado: 310, meta: 300, status: 'Alcançada', progresso: 103 },
        { etapa: 'Vendas Fechadas', realizado: 85, meta: 100, status: 'Atenção', progresso: 85 },
    ];

    const consultores = [
        { id: 1, name: 'Ana Souza', agendamentos: 142, comparecimento: 78, conversao: 32, origem: 'WhatsApp' },
        { id: 2, name: 'Beto Lima', agendamentos: 98, comparecimento: 82, conversao: 28, origem: 'Telefone' },
        { id: 3, name: 'Carla Dias', agendamentos: 110, comparecimento: 71, conversao: 30, origem: 'Instagram' },
    ];

    const avaliadoras = [
        { id: 1, name: 'Dra. Marina', vendas: 45, ticket: 1580, rating: 4.9 },
        { id: 2, name: 'Dra. Roberta', vendas: 28, ticket: 1350, rating: 4.7 },
        { id: 3, name: 'Dra. Luiza', vendas: 12, ticket: 1620, rating: 5.0 },
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-800">Comercial & Vendas</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <StatCard title="Tempo L->Agend" value="2.4 dias" subtitle="Lead até agendamento" icon={Clock} />
                <StatCard title="Tempo Agend->Venda" value="5.1 dias" subtitle="Agendamento até faturar" icon={Clock} />
                <StatCard title="Dias Zerados" value="3" subtitle="Sem faturamento no período" trend="1" trendType="up" icon={CalendarIcon} />
                <StatCard title="Conversão Global" value="7.08%" subtitle="Leads que fecharam" trend="0.5%" trendType="up" icon={Activity} />
                <StatCard title="Revenda / Recorrência" value="42%" subtitle="Share de retenção" trend="3%" trendType="up" icon={Repeat} />
                <StatCard title="Frequência Clínica" value="45 dias" subtitle="Retorno do paciente" icon={Users} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center justify-center">Faturamento por Tipo</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={ticketTipo} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                                    {ticketTipo.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip 
                                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Valor']}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 justify-between flex flex-col rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Ranking por Unidade</h3>
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-400 uppercase bg-gray-50/50">
                                <tr>
                                    <th className="px-4 py-3 rounded-tl-lg font-bold">Unidade</th>
                                    <th className="px-4 py-3 font-bold">Faturamento</th>
                                    <th className="px-4 py-3 font-bold">Vendas</th>
                                    <th className="px-4 py-3 rounded-tr-lg font-bold">Tícket Médio</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rankingUnidades.map((unidade, idx) => (
                                    <tr key={unidade.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3 font-semibold text-gray-700 flex items-center gap-2">
                                            {idx === 0 && <Award className="w-4 h-4 text-amber-500" />}
                                            {unidade.name}
                                        </td>
                                        <td className="px-4 py-3 font-bold text-amber-600">R$ {unidade.faturamento.toLocaleString('pt-BR')}</td>
                                        <td className="px-4 py-3 text-gray-600">{unidade.vendas}</td>
                                        <td className="px-4 py-3 text-gray-500">R$ {unidade.ticket.toLocaleString('pt-BR')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white p-6 justify-between flex flex-col rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Atingimento por Unidade</h3>
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-400 uppercase bg-gray-50/50">
                                <tr>
                                    <th className="px-4 py-3 rounded-tl-lg font-bold">Unidade</th>
                                    <th className="px-4 py-3 font-bold">Realizado</th>
                                    <th className="px-4 py-3 font-bold">Meta</th>
                                    <th className="px-4 py-3 rounded-tr-lg font-bold">Análise (Crescimento)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {atingimentoUnidades.map((unidade) => (
                                    <tr key={unidade.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3 font-semibold text-gray-700">{unidade.name}</td>
                                        <td className="px-4 py-3 font-bold text-amber-600">R$ {unidade.realizado.toLocaleString('pt-BR')}</td>
                                        <td className="px-4 py-3 text-gray-600">R$ {unidade.meta.toLocaleString('pt-BR')}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${unidade.crescimento >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {unidade.crescimento >= 0 ? '+' : ''}{unidade.crescimento}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white p-6 justify-between flex flex-col rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Metas do Funil</h3>
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-400 uppercase bg-gray-50/50">
                                <tr>
                                    <th className="px-4 py-3 rounded-tl-lg font-bold">Etapa</th>
                                    <th className="px-4 py-3 font-bold text-right">Progresso</th>
                                </tr>
                            </thead>
                            <tbody>
                                {acompanhamentoFunil.map((item, idx) => (
                                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-700">
                                            <div className="flex flex-col">
                                                <span>{item.etapa}</span>
                                                <span className="text-xs text-gray-400">{item.realizado}/{item.meta}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                item.progresso >= 100 ? 'bg-green-100 text-green-700' : 
                                                item.progresso >= 80 ? 'bg-amber-100 text-amber-700' : 
                                                'bg-red-100 text-red-700'
                                            }`}>
                                                {item.progresso}% ({item.status})
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white p-6 justify-between flex flex-col rounded-2xl border border-gray-100 shadow-sm lg:col-span-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Consultores */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><User className="w-5 h-5 text-amber-600" /> Rank: Consultores/SDR</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-400 uppercase bg-gray-50/50">
                                        <tr>
                                            <th className="px-3 py-2 font-bold">Consultor</th>
                                            <th className="px-3 py-2 font-bold text-center">Age.</th>
                                            <th className="px-3 py-2 font-bold text-center">Comp.</th>
                                            <th className="px-3 py-2 font-bold text-center">Conv.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {consultores.map(c => (
                                            <tr key={c.id} className="border-b border-gray-50">
                                                <td className="px-3 py-2 font-semibold text-gray-700">
                                                    {c.name}
                                                    <div className="text-[10px] text-gray-400 font-normal">{c.origem}</div>
                                                </td>
                                                <td className="px-3 py-2 text-center text-gray-600">{c.agendamentos}</td>
                                                <td className="px-3 py-2 text-center text-gray-600">{c.comparecimento}%</td>
                                                <td className="px-3 py-2 text-center font-bold text-amber-600">{c.conversao}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Avaliadoras */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Award className="w-5 h-5 text-amber-600" /> Rank: Avaliadoras/Closers</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-400 uppercase bg-gray-50/50">
                                        <tr>
                                            <th className="px-3 py-2 font-bold">Avaliadora</th>
                                            <th className="px-3 py-2 font-bold text-center">Vendas</th>
                                            <th className="px-3 py-2 font-bold text-center">Ticket</th>
                                            <th className="px-3 py-2 font-bold text-center">Rating</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {avaliadoras.map(a => (
                                            <tr key={a.id} className="border-b border-gray-50">
                                                <td className="px-3 py-2 font-semibold text-gray-700">{a.name}</td>
                                                <td className="px-3 py-2 text-center font-bold text-amber-600">{a.vendas}</td>
                                                <td className="px-3 py-2 text-center text-gray-600">R$ {a.ticket}</td>
                                                <td className="px-3 py-2 text-center text-gray-600">⭐ {a.rating}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TabOperacional = () => {
    const comparecimentoData = [
        { semana: 'Sem 1', agendados: 120, compareceram: 90, vendas: 25 },
        { semana: 'Sem 2', agendados: 150, compareceram: 110, vendas: 30 },
        { semana: 'Sem 3', agendados: 110, compareceram: 85, vendas: 18 },
        { semana: 'Sem 4', agendados: 180, compareceram: 140, vendas: 45 },
    ];

    const logMarcações = [
        { data: '03/05/2026', unidade: 'Clínica SP', servico: 'Avaliação Estética', status: 'Realizado' },
        { data: '03/05/2026', unidade: 'Clínica RJ', servico: 'Retorno Botulínica', status: 'Pendente' },
        { data: '02/05/2026', unidade: 'Clínica MG', servico: 'Peeling Químico', status: 'Cancelado' },
        { data: '02/05/2026', unidade: 'Clínica SP', servico: 'Avaliação Médica', status: 'Realizado' },
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-800">Operacional & Agenda</h2>

            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <StatCard title="Ocupação Geral" value="82%" subtitle="Agenda bloqueada" icon={CalendarIcon} highlight={true} />
                <StatCard title="Share Avaliações" value="45%" subtitle="Agendamentos" icon={Users} />
                <StatCard title="Share Procedim." value="35%" subtitle="Agendamentos" icon={Activity} />
                <StatCard title="Share Retornos" value="20%" subtitle="Agendamentos" icon={Repeat} />
                <StatCard title="Absenteísmo" value="18%" subtitle="Taxa de No-Show" trend="-2%" trendType="up" icon={UserPlus} />
                <StatCard title="Cancelados" value="5%" subtitle="Desistências efetivadas" icon={X} />
                <StatCard title="Excluídos" value="1.2%" subtitle="Erros de agendamento" icon={Bug} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Comparecimento vs Sucesso (Vendas)</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={comparecimentoData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="semana" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                <Bar yAxisId="left" dataKey="compareceram" name="Compareceram" barSize={32} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                <Area yAxisId="left" type="monotone" dataKey="vendas" name="Vendas Sucesso" fill="#fef3c7" stroke="#d97706" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Log Operacional de Marcações</h3>
                    <div className="flex-1 overflow-y-auto w-full custom-scrollbar max-h-72">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-400 uppercase bg-gray-50/50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 font-bold">Data</th>
                                    <th className="px-4 py-3 font-bold">Unidade</th>
                                    <th className="px-4 py-3 font-bold">Serviço</th>
                                    <th className="px-4 py-3 font-bold">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logMarcações.map((log, idx) => (
                                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3 text-gray-500">{log.data}</td>
                                        <td className="px-4 py-3 font-semibold text-gray-700">{log.unidade}</td>
                                        <td className="px-4 py-3 text-gray-600">{log.servico}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                log.status === 'Realizado' ? 'bg-green-100 text-green-700' : 
                                                log.status === 'Cancelado' ? 'bg-red-100 text-red-700' : 
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                                {log.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TabFinanceiro = () => {
    const recebimento = [
        { name: 'Cartão Crédito', value: 65000 },
        { name: 'PIX', value: 35000 },
        { name: 'Boleto', value: 12400 },
        { name: 'Dinheiro', value: 5500 },
    ];

    const antecipacoes = [
        { name: 'Antecipado', value: 45000 },
        { name: 'Fluxo Normal', value: 77400 },
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-800">Financeiro & Fluxo de Caixa</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Receita (Faturada x Recebida)" value="85%" subtitle="R$ 122.4k vs R$ 104k" icon={DollarSign} highlight={true} />
                <StatCard title="Orçamentos Abertos" value="R$ 45.200" subtitle="Propostas não fechadas" trend="5%" trendType="up" icon={FileText} />
                <StatCard title="Parcelamento Médio" value="4.2x" subtitle="Vezes no cartão" trend="-0.5x" trendType="down" icon={Calculator} />
                <StatCard title="Custos de Insumos" value="R$ 18.500" subtitle="Custo com produtos" trend="2%" trendType="down" icon={PackageX} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center justify-center">Formas de Recebimento</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={recebimento} cx="50%" cy="50%" innerRadius={0} outerRadius={100} paddingAngle={2} dataKey="value">
                                    {recebimento.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip 
                                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Valor']}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center justify-center">Composição de Antecipações</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={antecipacoes} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={0} dataKey="value">
                                    {antecipacoes.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#fef3c7'} />
                                    ))}
                                </Pie>
                                <RechartsTooltip 
                                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Valor']}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TabPortfolio = () => {
    const receitaCustos = [
        { categoria: 'Injetáveis', receita: 85000, custo: 25000 },
        { categoria: 'Lasers', receita: 45000, custo: 8000 },
        { categoria: 'Fios', receita: 30000, custo: 12000 },
        { categoria: 'Skincare', receita: 15000, custo: 4000 },
    ];

    const bcgData = [
        { x: 80, y: 30, z: 200, name: 'Toxina' }, // x = Vendas Relativas, y = Crescimento, z = Faturamento
        { x: 40, y: 60, z: 150, name: 'Preenchimento' },
        { x: 10, y: 80, z: 80, name: 'Laser Lavieen' },
        { x: 60, y: 10, z: 90, name: 'Peeling' },
        { x: 20, y: 5,  z: 40, name: 'Fios Liso' },
    ];

    const analiseProcedimentos = [
        { id: 1, nome: 'Toxina Botulínica (3 Áreas)', receita: 85000, insumos: 15000, margem: 82.3 },
        { id: 2, name: 'Preenchimento Labial (1ml)', receita: 42000, insumos: 12000, margem: 71.4 },
        { id: 3, name: 'Laser Lavieen (Rosto Todo)', receita: 28000, insumos: 2500, margem: 91.0 },
        { id: 4, name: 'Fios de PDO (Liso - 10 Fios)', receita: 18000, insumos: 6000, margem: 66.6 },
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-800">Portfólio & Rentabilidade</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Total de Serviços" value="34" subtitle="Procedimentos catalogados" icon={Layout} />
                <StatCard title="Custo Médio Insumos" value="28%" subtitle="Sobre o faturamento" trend="-2%" trendType="up" icon={PackageX} />
                <StatCard title="Lucro Médio Operacional" value="R$ 480" subtitle="Por procedimento" trend="5%" trendType="up" icon={DollarSign} highlight={true} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Receita vs Custos por Categoria</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={receitaCustos} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="categoria" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                                <YAxis yAxisId="left" orientation="left" stroke="#f59e0b" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                                <YAxis yAxisId="right" orientation="right" stroke="#ef4444" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                                <RechartsTooltip 
                                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                <Bar yAxisId="left" dataKey="receita" name="Receita Bruta" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                <Bar yAxisId="right" dataKey="custo" name="Custo (Insumos)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 justify-between flex flex-col rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Análise de Procedimentos e Margem Bruta</h3>
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-400 uppercase bg-gray-50/50">
                                <tr>
                                    <th className="px-4 py-3 rounded-tl-lg font-bold">Procedimento</th>
                                    <th className="px-4 py-3 font-bold">Receita (R$)</th>
                                    <th className="px-4 py-3 font-bold">Insumos (R$)</th>
                                    <th className="px-4 py-3 rounded-tr-lg font-bold">Margem (%)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analiseProcedimentos.map((proc, idx) => (
                                    <tr key={proc.id || idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3 font-semibold text-gray-700">{proc.nome || proc.name}</td>
                                        <td className="px-4 py-3 font-bold text-amber-600">{proc.receita.toLocaleString('pt-BR')}</td>
                                        <td className="px-4 py-3 text-red-500">{proc.insumos.toLocaleString('pt-BR')}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${proc.margem > 80 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {proc.margem}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center justify-center">Matriz BCG Estratégica (Serviços)</h3>
                    <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                <XAxis type="number" dataKey="x" name="Crescimento de Mercado %" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                                <YAxis type="number" dataKey="y" name="Participação de Mercado %" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                                <ZAxis type="number" dataKey="z" range={[100, 1000]} name="Volume" />
                                <RechartsTooltip 
                                    cursor={{ strokeDasharray: '3 3' }} 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: number, name: string, props: any) => `${value} (${props.payload.name})`}
                                />
                                <Scatter name="Serviços" data={bcgData} fill="#f59e0b" opacity={0.8}>
                                    {bcgData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TabDebug = () => {
    const [mode, setMode] = useState('Rápida');

    const markdownText = mode === 'Rápida' 
    ? `# 📊 Painel de Controle Estratégico - Análise Rápida Consolidada

## 1. Resumo Executivo
- **Faturamento Total:** R$ 3.840.120 (+12% MoM)
- **Vendas Totais:** 1.402 (+8% MoM)
- **Tícket Médio:** R$ 2.738 (+3% MoM)
- **CAC:** R$ 205
- **Ocupação Média Geral:** 82%
- **Meta Alcançada:** 91%

## 2. Marketing & Aquisição
- **Total de Leads:** 1.200
- **CPL Médio Geral:** R$ 15,20
- **Custo Total de Marketing (Investimento):** R$ 18.240
- **ROAS Global:** 6.7x

## 3. Comercial & Vendas
- **Tempo Médio (Lead -> Agendamento):** 4h 12m
- **Tempo Médio (Agendamento -> Venda):** 1d 5h
- **Conversão Global:** 28%
- **Revenda e Recorrência:** 35% do Faturamento

## 4. Operacional & Agenda
- **Ocupação de Agenda:** 82%
- **Taxa de Absenteísmo (No-Show):** 15%
- **Quantidade de Cancelados:** 42

## 5. Financeiro & Fluxo de Caixa
- **Receita Recebida vs Faturada:** R$ 2.100.000 / R$ 3.840.120 (54%)
- **Volume de Orçamentos em Aberto:** R$ 1.200.000

## 6. Portfólio & Rentabilidade
- **Lucro Médio Global:** 42%
- **Produto Estrela (BCG):** Toxina Botulínica (3 Áreas) - Alta Lucratividade e Alta Demanda
` 
    : `# 📊 Dados Brutos - Análise Detalhada (Log de Carga Histórica Não-Paginada)

[DEBUG_INICIO_DA_CARGA]
- Log table: faturamento_diario
[2026-05-01] {"faturamento": 120000, "vendas": 45, "ticket": 2666}
[2026-05-02] {"faturamento": 135000, "vendas": 51, "ticket": 2647}
[2026-05-03] {"faturamento": 110000, "vendas": 38, "ticket": 2894}

- Log heatmap: comparecimentos
[Segunda] 9h: 12, 10h: 15, 11h: 14, 14h: 18, 15h: 16
[Terça] 9h: 10, 10h: 14, 11h: 18, 14h: 15, 15h: 17

- Relatório Consolidado de Leads
["Instagram"] Leads: 500, Custo: 6000, CPL: 12.0
["Google Ads"] Leads: 450, Custo: 9000, CPL: 20.0
["Orgânico"] Leads: 250, Custo: 0, CPL: 0

- Base de Agendamentos (D-1 Analítico)
[1D-001] "João Silva", "Toxina", Status: Compareceu, Venda: Sim
[1D-002] "Maria", "Fios", Status: No-show, Venda: Não
... (Carregando todos os 4.000 registros históricos)

[MENSAGEM AO LLM]: Utilize esses agregados para cruzar motivos de no-show com a origem de leads, e indique as 3 maiores alavancas de rentabilidade para a próxima semana.
`;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-800">Debug e Operações</h2>
            <div className="bg-white p-6 border border-gray-200 rounded-2xl shadow-sm text-gray-800 text-sm max-h-[700px] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <Terminal className="w-5 h-5 text-gray-700" />
                        <span className="font-bold text-gray-900 text-lg">Visualização tipo Código (Raw) - Para IA</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-400 uppercase">Seletor de Extração:</span>
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            <button 
                                onClick={() => setMode('Rápida')}
                                className={`px-4 py-2 rounded-md text-xs font-bold transition-all shadow-sm \${mode === 'Rápida' ? 'bg-white text-amber-600' : 'bg-transparent text-gray-500 hover:text-gray-700'}`}>
                                Análise Rápida
                            </button>
                            <button 
                                onClick={() => setMode('Detalhada')}
                                className={`px-4 py-2 rounded-md text-xs font-bold transition-all shadow-sm \${mode === 'Detalhada' ? 'bg-white text-indigo-600' : 'bg-transparent text-gray-500 hover:text-gray-700'}`}>
                                Análise Detalhada
                            </button>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-900 rounded-xl p-6 overflow-auto shadow-inner">
                    <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap leading-relaxed">{markdownText}</pre>
                </div>
            </div>
        </div>
    );
};

const AssistantChat = ({ onClose }: any) => {
    return (
        <div className="absolute bottom-16 right-0 w-80 sm:w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300 translate-y-2">
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4 text-white flex justify-between items-center z-10">
                <h3 className="font-bold flex items-center gap-2 drop-shadow-sm"><MessageSquare className="w-5 h-5"/> Assistente Gemini</h3>
            </div>
            <div className="flex-1 bg-gray-50 p-4 overflow-y-auto text-sm space-y-4">
                <div className="bg-white p-3 rounded-xl rounded-tl-none border border-gray-200 shadow-sm inline-block max-w-[85%] text-gray-700">
                    Olá! Sou o Assistente de Inteligência Artificial para este dashboard de Regionais. Como posso ajudar com a análise dos dados hoje?
                </div>
                <div className="flex flex-col gap-2 mt-4 ml-8 items-end w-full max-w-[90%] self-end">
                    <button className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-indigo-100 text-left transition-colors self-end">
                        ⚡ Análise Rápida (Executiva)
                    </button>
                    <button className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-indigo-100 text-left transition-colors self-end">
                        📊 Análise Detalhada (Logs)
                    </button>
                </div>
            </div>
            <div className="p-3 border-t border-gray-200 bg-white">
                <div className="flex bg-gray-100 rounded-xl p-1 shadow-inner border border-gray-200">
                    <input type="text" placeholder="Tire uma dúvida com a IA..." className="flex-1 bg-transparent px-3 text-sm outline-none font-medium text-gray-700" />
                    <button className="bg-indigo-600 p-2 rounded-lg text-white hover:bg-indigo-700 shadow-md transition-colors">
                        <ArrowRightCircle className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RegionaisDashboard;

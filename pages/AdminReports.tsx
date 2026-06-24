import React, { useState, useEffect } from 'react';
import {
    TrendingUp,
    Download,
    Calendar,
    Loader2,
    Filter,
    FileText,
    DollarSign,
    Users,
    ShoppingBag,
    Wallet
} from 'lucide-react';
import { ORGANIZATION_ID } from '../lib/config';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface ReportData {
    id: string;
    col1: string; // Description or Name
    col2: string; // Secondary info / Date
    col3: string; // Status or Level
    col4: number; // Value or Amount
}

const AdminReports: React.FC = () => {
    const [reportType, setReportType] = useState<'vendas' | 'ativacoes' | 'comissoes' | 'saques'>('vendas');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<ReportData[]>([]);
    
    // KPI States
    const [stats, setStats] = useState({
        totalSales: 0,
        activeAffiliates: 0,
        totalCommissions: 0,
        totalWithdrawals: 0
    });

    useEffect(() => {
        fetchKPIs();
        handleGenerateReport();
    }, [reportType]);

    const fetchKPIs = async () => {
        try {
            // 1. Total Sales
            const { data: salesData } = await supabase
                .from('orders')
                .select('total_amount')
                .eq('organization_id', ORGANIZATION_ID)
                .eq('status', 'Pago');
            const salesSum = (salesData || []).reduce((acc, curr) => acc + Number(curr.total_amount), 0);

            // 2. Active Affiliates count
            const { count: activeCount } = await supabase
                .from('affiliates')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', ORGANIZATION_ID)
                .gte('active_until', new Date().toISOString());

            // 3. Total Commissions
            const { data: commsData } = await supabase
                .from('commissions')
                .select('amount')
                .eq('organization_id', ORGANIZATION_ID);
            const commsSum = (commsData || []).reduce((acc, curr) => acc + Number(curr.amount), 0);

            // 4. Total Payouts (paid withdrawals)
            const { data: withdrawsData } = await supabase
                .from('withdrawals')
                .select('amount_requested')
                .eq('organization_id', ORGANIZATION_ID)
                .in('status', ['paid', 'completed', 'Pago']);
            const withdrawsSum = (withdrawsData || []).reduce((acc, curr) => acc + Number(curr.amount_requested), 0);

            setStats({
                totalSales: salesSum,
                activeAffiliates: activeCount || 0,
                totalCommissions: commsSum,
                totalWithdrawals: withdrawsSum
            });
        } catch (error) {
            console.error('Error fetching KPIs:', error);
        }
    };

    const handleGenerateReport = async () => {
        setIsLoading(true);
        try {
            let query: any;
            
            if (reportType === 'vendas') {
                query = supabase
                    .from('orders')
                    .select('id, customer_name, created_at, status, total_amount')
                    .eq('organization_id', ORGANIZATION_ID);
            } else if (reportType === 'ativacoes') {
                query = supabase
                    .from('affiliates')
                    .select('id, full_name, created_at, active_until, is_active')
                    .eq('organization_id', ORGANIZATION_ID);
            } else if (reportType === 'comissoes') {
                query = supabase
                    .from('commissions')
                    .select('id, description, created_at, level, amount')
                    .eq('organization_id', ORGANIZATION_ID);
            } else {
                query = supabase
                    .from('withdrawals')
                    .select('id, pix_key, created_at, status, amount_requested')
                    .eq('organization_id', ORGANIZATION_ID);
            }

            // Apply Date Filters
            if (startDate) {
                query = query.gte('created_at', new Date(startDate).toISOString());
            }
            if (endDate) {
                // Set end date to end of the day (23:59:59)
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query = query.lte('created_at', end.toISOString());
            }

            const { data: rawData, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;

            // Map raw data into generic columns for preview
            const mappedData: ReportData[] = (rawData || []).map((item: any) => {
                if (reportType === 'vendas') {
                    return {
                        id: item.id,
                        col1: item.customer_name || 'Cliente',
                        col2: new Date(item.created_at).toLocaleDateString('pt-BR'),
                        col3: item.status,
                        col4: Number(item.total_amount)
                    };
                } else if (reportType === 'ativacoes') {
                    const isActive = item.active_until ? new Date(item.active_until) >= new Date() : item.is_active;
                    return {
                        id: item.id,
                        col1: item.full_name || 'Afiliado',
                        col2: item.active_until ? new Date(item.active_until).toLocaleDateString('pt-BR') : 'Sem Vencimento',
                        col3: isActive ? 'Ativo' : 'Inativo',
                        col4: 0
                    };
                } else if (reportType === 'comissoes') {
                    return {
                        id: item.id,
                        col1: item.description || 'Comissão',
                        col2: new Date(item.created_at).toLocaleDateString('pt-BR'),
                        col3: `Nível ${item.level}`,
                        col4: Number(item.amount)
                    };
                } else {
                    return {
                        id: item.id,
                        col1: `Chave: ${item.pix_key}`,
                        col2: new Date(item.created_at).toLocaleDateString('pt-BR'),
                        col3: item.status,
                        col4: Number(item.amount_requested)
                    };
                }
            });

            setData(mappedData);
        } catch (error) {
            console.error('Error generating report:', error);
            toast.error('Erro ao gerar relatório.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportCSV = () => {
        if (data.length === 0) {
            toast.error('Não há dados para exportar.');
            return;
        }

        let headers = '';
        if (reportType === 'vendas') {
            headers = 'ID,Cliente,Data,Status,Valor\n';
        } else if (reportType === 'ativacoes') {
            headers = 'ID,Nome Afiliado,Vencimento,Status,Valor\n';
        } else if (reportType === 'comissoes') {
            headers = 'ID,Descrição,Data,Nível,Rendimento\n';
        } else {
            headers = 'ID,PIX Destinatário,Data,Status,Valor Solicitado\n';
        }

        const csvContent = data.map(item => {
            return `"${item.id}","${item.col1}","${item.col2}","${item.col3}",${item.col4}`;
        }).join('\n');

        const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `relatorio_${reportType}_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Relatório exportado com sucesso!');
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    return (
        <AdminLayout>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-black text-[#05080F]">Relatórios Consolidados</h1>
                    <p className="text-slate-500 font-medium text-sm md:text-base">Gere relatórios de auditoria e exporte dados operacionais da CELD Distribuidora.</p>
                </div>

                {/* KPI stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                    {[
                        { label: 'Faturamento de Vendas', value: formatCurrency(stats.totalSales), icon: ShoppingBag, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                        { label: 'Afiliados Ativos', value: stats.activeAffiliates, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
                        { label: 'Comissões Distribuídas', value: formatCurrency(stats.totalCommissions), icon: DollarSign, color: 'text-purple-500', bg: 'bg-purple-50' },
                        { label: 'Saques Liquidados', value: formatCurrency(stats.totalWithdrawals), icon: Wallet, color: 'text-amber-500', bg: 'bg-amber-50' }
                    ].map((card, idx) => (
                        <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{card.label}</p>
                                <h3 className="text-xl font-black text-[#05080F]">{card.value}</h3>
                            </div>
                            <div className={`w-12 h-12 rounded-2xl ${card.bg} ${card.color} flex items-center justify-center`}>
                                <card.icon className="w-5 h-5" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Control Panel Filter */}
                <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Relatório</label>
                            <div className="relative">
                                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                <select
                                    value={reportType}
                                    onChange={(e) => setReportType(e.target.value as any)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3.5 pl-12 pr-4 outline-none text-xs font-bold text-slate-700 focus:border-emerald-500 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="vendas">Vendas / Pedidos</option>
                                    <option value="ativacoes">Ativações / Afiliados</option>
                                    <option value="comissoes">Comissões Pagas</option>
                                    <option value="saques">Saques Efetuados</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Inicial</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-12 pr-4 outline-none text-xs font-bold text-slate-700 focus:border-emerald-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Final</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-12 pr-4 outline-none text-xs font-bold text-slate-700 focus:border-emerald-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={handleGenerateReport}
                                disabled={isLoading}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-4 font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
                                FILTRAR
                            </button>
                            <button
                                onClick={handleExportCSV}
                                disabled={isLoading || data.length === 0}
                                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-4 px-6 font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Exportar CSV"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Preview Table */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                        <h3 className="text-lg font-black text-[#05080F] uppercase tracking-wider">Visualização dos Dados</h3>
                        <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full uppercase tracking-widest">{data.length} Linhas Encontradas</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px]">
                            <thead>
                                <tr className="bg-slate-50/50 text-left border-b border-slate-50">
                                    <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                                    <th className="py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Informações Principais</th>
                                    <th className="py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento / Data</th>
                                    <th className="py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status / Nível</th>
                                    {reportType !== 'ativacoes' && (
                                        <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
                                            <p className="font-bold text-slate-400 text-xs uppercase tracking-widest">Buscando dados...</p>
                                        </td>
                                    </tr>
                                ) : data.length > 0 ? (
                                    data.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/20 transition-all">
                                            <td className="py-5 px-8">
                                                <span className="text-[10px] font-bold text-slate-400 font-mono">#{item.id.slice(0, 8)}</span>
                                            </td>
                                            <td className="py-5 px-4 font-bold text-[#05080F] text-sm">
                                                {item.col1}
                                            </td>
                                            <td className="py-5 px-4 text-slate-500 font-bold text-xs">
                                                {item.col2}
                                            </td>
                                            <td className="py-5 px-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                    item.col3 === 'Ativo' || item.col3 === 'Pago' || item.col3 === 'completed' || item.col3 === 'paid' || item.col3 === 'Aprovado' ? 'bg-emerald-50 text-emerald-600' :
                                                    item.col3 === 'Pendente' || item.col3 === 'pending' || item.col3 === 'Em análise' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                                                }`}>
                                                    {item.col3}
                                                </span>
                                            </td>
                                            {reportType !== 'ativacoes' && (
                                                <td className="py-5 px-8 text-right font-black text-emerald-500">
                                                    {formatCurrency(item.col4)}
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <FileText className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                                            <p className="font-bold text-slate-400 font-inter text-sm">Nenhum registro encontrado no período.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminReports;

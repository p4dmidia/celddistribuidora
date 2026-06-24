import React, { useState, useEffect } from 'react';
import {
    Wallet,
    CheckCircle2,
    XCircle,
    Clock,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Filter,
    Calendar,
    Send,
    ShieldCheck,
    Coins,
    Banknote,
    Loader2,
    TrendingUp,
    Download,
    AlertCircle,
    FileText,
    Upload,
    ExternalLink
} from 'lucide-react';
import { ORGANIZATION_ID } from '../lib/config';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface WithdrawalRequest {
    id: string;
    user_id: string;
    amount_requested: number;
    fee_amount: number;
    net_amount: number;
    pix_key: string;
    created_at: string;
    status: 'pending' | 'approved' | 'paid' | 'rejected';
    proof_url?: string;
    affiliate?: {
        full_name: string;
    };
}

interface PendingPayout {
    user_id: string;
    full_name: string;
    pix_key: string;
    available_balance: number;
}

const AdminFinancial: React.FC = () => {
    const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
    const [pendingPayouts, setPendingPayouts] = useState<PendingPayout[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'paid' | 'rejected'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedPayout, setSelectedPayout] = useState<PendingPayout | null>(null);
    const [uploadingProof, setUploadingProof] = useState(false);
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [processingPayment, setProcessingPayment] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Affiliates to perform local join (bypasses PostgREST missing relationship issue)
            const { data: affiliatesData, error: affiliatesError } = await supabase
                .from('affiliates')
                .select('user_id, full_name')
                .eq('organization_id', ORGANIZATION_ID);

            if (affiliatesError) throw affiliatesError;

            const affiliateMap = new Map<string, string>(
                affiliatesData?.map(a => [a.user_id, a.full_name]) || []
            );

            // 2. Fetch Withdrawal/Payment History
            const { data: withdrawalsData, error: withdrawalsError } = await supabase
                .from('withdrawals')
                .select('*')
                .eq('organization_id', ORGANIZATION_ID)
                .order('created_at', { ascending: false });

            if (withdrawalsError) throw withdrawalsError;

            const formattedRequests: WithdrawalRequest[] = withdrawalsData?.map((w: any) => ({
                ...w,
                affiliate: {
                    full_name: affiliateMap.get(w.user_id) || 'Usuário Desconhecido'
                }
            })) || [];

            setRequests(formattedRequests);

            // 3. Fetch User Settings with Balance (Pending Payouts)
            const { data: balanceData, error: balanceError } = await supabase
                .from('user_settings')
                .select('user_id, available_balance, pix_key')
                .eq('organization_id', ORGANIZATION_ID)
                .gt('available_balance', 0);

            if (balanceError) throw balanceError;

            const formattedPayouts = balanceData?.map((b: any) => ({
                user_id: b.user_id,
                full_name: affiliateMap.get(b.user_id) || 'Usuário',
                pix_key: b.pix_key || 'Não cadastrada',
                available_balance: b.available_balance
            })) || [];

            setPendingPayouts(formattedPayouts);

        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Erro ao carregar dados financeiros.');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredRequests = requests.filter(req => {
        const matchesFilter = filter === 'all' || req.status === filter;
        const name = req.affiliate?.full_name || 'Usuário Desconhecido';
        const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || req.pix_key.includes(searchTerm);
        return matchesFilter && matchesSearch;
    });

    const handleAction = async (id: string, newStatus: 'approved' | 'rejected') => {
        try {
            const { error } = await supabase
                .from('withdrawals')
                .update({ status: newStatus })
                .eq('id', id)
                .eq('organization_id', ORGANIZATION_ID);

            if (error) throw error;

            toast.success(newStatus === 'approved' ? 'Saque aprovado!' : 'Saque rejeitado.');
            fetchRequests();
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Erro ao atualizar status.');
        }
    };

    const handleConfirmPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPayout || !proofFile) {
            toast.error('Selecione o comprovante.');
            return;
        }

        setProcessingPayment(true);
        try {
            // 1. Upload Proof
            const fileExt = proofFile.name.split('.').pop();
            const fileName = `${selectedPayout.user_id}_${Date.now()}.${fileExt}`;
            const filePath = `payouts/${fileName}`;

            const { error: uploadError, data: uploadData } = await supabase.storage
                .from('payment-proofs')
                .upload(filePath, proofFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('payment-proofs')
                .getPublicUrl(filePath);

            // 2. Create Withdrawal Record (Status: Paid)
            const { error: drawError } = await supabase
                .from('withdrawals')
                .insert([{
                    user_id: selectedPayout.user_id,
                    amount_requested: selectedPayout.available_balance,
                    net_amount: selectedPayout.available_balance,
                    pix_key: selectedPayout.pix_key,
                    status: 'paid',
                    processed_at: new Date().toISOString(),
                    proof_url: publicUrl,
                    organization_id: ORGANIZATION_ID
                }]);

            if (drawError) throw drawError;

            // 3. Deduct from Balance
            const { error: balanceError } = await supabase
                .from('user_settings')
                .update({ 
                    available_balance: 0,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', selectedPayout.user_id)
                .eq('organization_id', ORGANIZATION_ID);

            if (balanceError) throw balanceError;

            toast.success('Pagamento registrado com sucesso!');
            setIsPaymentModalOpen(false);
            setProofFile(null);
            fetchRequests();

        } catch (error: any) {
            console.error('Error processing payment:', error);
            toast.error(error.message || 'Erro ao processar pagamento.');
        } finally {
            setProcessingPayment(false);
        }
    };

    // Stats calculations
    const totalPendente = requests
        .filter(r => r.status === 'pending' || r.status === 'approved')
        .reduce((acc, curr) => acc + curr.amount_requested, 0);

    const paidThisMonth = requests
        .filter(r => {
            if (r.status !== 'paid') return false;
            const date = new Date(r.created_at);
            const now = new Date();
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        })
        .reduce((acc, curr) => acc + curr.amount_requested, 0);

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <Loader2 className="w-10 h-10 text-[#FBC02D] animate-spin" />
                    <p className="font-bold text-slate-400">Carregando dados financeiros...</p>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-[#05080F]">Gestão Financeira</h1>
                        <p className="text-slate-500 font-medium text-sm md:text-base">Controle de saques, aprovações e processamento de pagamentos.</p>
                    </div>
                </div>

                {/* Dashboard Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-[#05080F] rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FBC02D]/10 blur-3xl rounded-full"></div>
                        <div className="relative z-10">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4 md:mb-6 backdrop-blur-md">
                                <Wallet className="w-5 h-5 md:w-6 md:h-6 text-[#FBC02D]" />
                            </div>
                            <p className="text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-widest leading-none mb-2">Total Pendente</p>
                            <h3 className="text-2xl md:text-3xl font-black text-[#FBC02D]">
                                R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </h3>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 border border-slate-100 shadow-sm relative overflow-hidden group">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 md:mb-6">
                            <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" />
                        </div>
                        <p className="text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-widest leading-none mb-2">Pago este Mês</p>
                        <h3 className="text-2xl md:text-3xl font-black text-[#05080F]">
                            R$ {paidThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h3>
                    </div>

                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 border border-slate-100 shadow-sm flex flex-col justify-center sm:col-span-2 lg:col-span-1">
                        <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-4">Próximo Fechamento</p>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-lg font-black text-[#05080F]">Dia 15</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Pagamento Agendado</p>
                            </div>
                        </div>
                        <p className="text-[10px] font-medium text-slate-500 leading-relaxed mb-1">
                            O sistema agora processa os pagamentos de forma manual via PIX todo dia 15.
                        </p>
                    </div>
                </div>

                {/* Pending Payouts (Dashboard) */}
                <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 md:p-10 border-b border-slate-50">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg md:text-xl font-black text-[#05080F]">Pagamentos Pendentes (Dashboard Dia 15)</h3>
                            <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                {pendingPayouts.length} Afiliados a Pagar
                            </span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-50">
                                    <th className="text-left py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Afiliado / Chave PIX</th>
                                    <th className="text-left py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Saldo Acumulado</th>
                                    <th className="text-right py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {pendingPayouts.length > 0 ? pendingPayouts.map((p) => (
                                    <tr key={p.user_id} className="hover:bg-slate-50/30 transition-all">
                                        <td className="py-6 px-10">
                                            <div>
                                                <p className="font-black text-[#05080F] text-sm">{p.full_name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-1">
                                                    <Send className="w-3 h-3 text-[#FBC02D]" /> {p.pix_key}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="py-6 px-4">
                                            <p className="text-lg font-black text-emerald-600">
                                                R$ {p.available_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                        </td>
                                        <td className="py-6 px-10 text-right">
                                            <button 
                                                onClick={() => { setSelectedPayout(p); setIsPaymentModalOpen(true); }}
                                                className="bg-[#05080F] text-white text-[10px] font-black px-6 py-3 rounded-xl hover:bg-[#FBC02D] hover:text-[#05080F] transition-all shadow-lg"
                                            >
                                                REGISTRAR PAGAMENTO
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={3} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                                            Nenhum saldo pendente de pagamento.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Filters & Table */}
                <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 md:p-10 border-b border-slate-50">
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                            <h3 className="text-lg md:text-xl font-black text-[#05080F]">Histórico de Pagamentos Efetuados</h3>

                            <div className="flex flex-col sm:flex-row w-full xl:w-auto gap-4">
                                <div className="relative flex-1 sm:min-w-[280px]">
                                    <input
                                        type="text"
                                        placeholder="Buscar por afiliado ou chave PIX..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-10 outline-none text-[10px] md:text-xs font-medium focus:border-[#FBC02D] transition-all"
                                    />
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                </div>
                                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 overflow-x-auto no-scrollbar">
                                    {(['all', 'pending', 'approved', 'paid', 'rejected'] as const).map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setFilter(f)}
                                            className={`whitespace-nowrap px-3 md:px-4 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-white shadow-sm text-[#05080F]' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            {f === 'all' ? 'Ver Todos' : f === 'pending' ? 'Pendentes' : f === 'approved' ? 'Aprovados' : f === 'paid' ? 'Pagos' : 'Recusados'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="block lg:hidden divide-y divide-slate-50">
                        {filteredRequests.length > 0 ? filteredRequests.map((req) => (
                            <div key={req.id} className="p-6 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Afiliado</p>
                                        <p className="font-black text-[#05080F] text-sm">{req.affiliate?.full_name || 'Usuário Desconhecido'}</p>
                                        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-1">
                                            <Send className="w-3 h-3 text-[#FBC02D]" /> {req.pix_key}
                                        </p>
                                    </div>
                                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider ${req.status === 'paid' ? 'bg-emerald-50 text-emerald-600' :
                                        req.status === 'approved' ? 'bg-blue-50 text-blue-600' :
                                            req.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                                        }`}>
                                        {req.status === 'pending' ? 'Aguardando' :
                                            req.status === 'approved' ? 'Aprovado' :
                                                req.status === 'paid' ? 'Pago' : 'Recusado'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Data</p>
                                        <div className="flex items-center gap-2 text-slate-500 font-bold text-xs">
                                            <Calendar className="w-3.5 h-3.5 text-slate-300" />
                                            {new Date(req.created_at).toLocaleDateString('pt-BR')}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Valor</p>
                                        <p className="font-black text-[#05080F]">R$ {req.amount_requested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                                {req.status === 'pending' && (
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => handleAction(req.id, 'rejected')}
                                            className="flex-1 py-3 bg-red-50 text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100"
                                        >
                                            REJEITAR
                                        </button>
                                        <button
                                            onClick={() => handleAction(req.id, 'approved')}
                                            className="flex-3 py-3 bg-[#05080F] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#FBC02D] hover:text-[#05080F] transition-all border border-[#05080F]"
                                        >
                                            APROVAR SAQUE
                                        </button>
                                    </div>
                                )}
                            </div>
                        )) : (
                            <div className="py-20 text-center">
                                <div className="flex flex-col items-center gap-4 text-slate-400">
                                    <Wallet className="w-12 h-12 opacity-20" />
                                    <p className="font-bold">Nenhum pedido encontrado.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-50">
                                    <th className="text-left py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Afiliado / Chave PIX</th>
                                    <th className="text-left py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Data Solicitada</th>
                                    <th className="text-left py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Valor</th>
                                    <th className="text-left py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Status</th>
                                    <th className="text-right py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredRequests.length > 0 ? filteredRequests.map((req) => (
                                    <tr key={req.id} className="group hover:bg-slate-50/30 transition-all">
                                        <td className="py-6 px-10">
                                            <div>
                                                <p className="font-black text-[#05080F] text-sm">{req.affiliate?.full_name || 'Usuário Desconhecido'}</p>
                                                <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-1">
                                                    <Send className="w-3 h-3 text-[#FBC02D]" /> {req.pix_key}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="py-6 px-4">
                                            <div className="flex items-center gap-2 text-slate-500 font-bold text-xs">
                                                <Calendar className="w-3.5 h-3.5 text-slate-300" />
                                                {new Date(req.created_at).toLocaleDateString('pt-BR')}
                                            </div>
                                        </td>
                                        <td className="py-6 px-4">
                                            <p className="font-black text-[#05080F]">R$ {req.amount_requested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                        </td>
                                        <td className="py-6 px-4">
                                            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider ${req.status === 'paid' ? 'bg-emerald-50 text-emerald-600' :
                                                req.status === 'approved' ? 'bg-blue-50 text-blue-600' :
                                                    req.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                                                }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${req.status === 'paid' ? 'bg-emerald-500' :
                                                    req.status === 'approved' ? 'bg-blue-300' :
                                                        req.status === 'rejected' ? 'bg-red-400' : 'bg-amber-400'
                                                    }`}></div>
                                                {req.status === 'pending' ? 'Aguardando' :
                                                    req.status === 'approved' ? 'Aprovado' :
                                                        req.status === 'paid' ? 'Pago' : 'Recusado'}
                                            </span>
                                        </td>
                                        <td className="py-6 px-10 text-right">
                                            {req.proof_url && (
                                                <a 
                                                    href={req.proof_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all"
                                                    title="Ver Comprovante"
                                                >
                                                    <FileText className="w-5 h-5" />
                                                </a>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-4 text-slate-400">
                                                <Wallet className="w-12 h-12 opacity-20" />
                                                <p className="font-bold">Nenhum pedido de saque encontrado.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Payment Registration Modal */}
                {isPaymentModalOpen && selectedPayout && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#05080F]/80 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300 p-8 md:p-10">
                            <h2 className="text-2xl font-black text-[#05080F] mb-2">Registrar Pagamento</h2>
                            <p className="text-slate-500 text-sm mb-8 font-medium">
                                Confirme o envio do PIX para <span className="text-[#05080F] font-bold">{selectedPayout.full_name}</span>.
                            </p>

                            <div className="bg-slate-50 rounded-2xl p-6 mb-8 space-y-4">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Chave PIX</p>
                                    <p className="font-bold text-[#05080F]">{selectedPayout.pix_key}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor do Pagamento</p>
                                    <p className="text-2xl font-black text-emerald-600">
                                        R$ {selectedPayout.available_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleConfirmPayment} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Anexar Comprovante (IMG/PDF)</label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            required
                                            accept="image/*,.pdf"
                                            onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                            className="hidden"
                                            id="proof-upload"
                                        />
                                        <label
                                            htmlFor="proof-upload"
                                            className="w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#FBC02D] hover:bg-amber-50/30 transition-all group"
                                        >
                                            {proofFile ? (
                                                <>
                                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                                    <span className="text-xs font-bold text-slate-600">{proofFile.name}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-8 h-8 text-slate-300 group-hover:text-[#FBC02D] transition-colors" />
                                                    <span className="text-xs font-bold text-slate-400">Clique para selecionar arquivo</span>
                                                </>
                                            )}
                                        </label>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => { setIsPaymentModalOpen(false); setProofFile(null); }}
                                        className="flex-1 bg-slate-50 text-slate-400 font-black py-4 rounded-2xl hover:bg-slate-100 transition-all text-xs"
                                    >
                                        CANCELAR
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processingPayment}
                                        className="flex-1 bg-[#05080F] text-white font-black py-4 rounded-2xl hover:bg-[#FBC02D] hover:text-[#05080F] transition-all text-xs shadow-lg flex items-center justify-center gap-2"
                                    >
                                        {processingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                        {processingPayment ? 'PROCESSANDO...' : 'CONFIRMAR PAGAMENTO'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default AdminFinancial;

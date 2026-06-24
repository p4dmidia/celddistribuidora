import React, { useState, useEffect } from 'react';
import {
    Wallet,
    ArrowUpRight,
    ArrowDownLeft,
    Clock,
    CheckCircle,
    XCircle,
    DollarSign,
    CreditCard,
    PlusCircle,
    AlertCircle,
    RefreshCcw,
    Loader2
} from 'lucide-react';
import { ORGANIZATION_ID } from '../lib/config';
import AffiliateLayout from '../components/AffiliateLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import toast from 'react-hot-toast';

interface Withdrawal {
    id: string;
    amount_requested: number;
    net_amount: number;
    status: string;
    pix_key: string;
    proof_url?: string;
    created_at: string;
}

const AffiliateFinancial: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showPixModal, setShowPixModal] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [newPixKey, setNewPixKey] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');

    // Financial Data States
    const [balance, setBalance] = useState({
        total: 0,
        available: 0,
        frozen: 0,
        withdrawn: 0
    });
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [pixKey, setPixKey] = useState('Não cadastrada');

    const fetchFinancialData = async () => {
        if (!user) return;
        
        try {
            setLoading(true);

            // 1. Fetch Balances (user_settings)
            const { data: settingsData, error: settingsError } = await supabase
                .from('user_settings')
                .select('available_balance, frozen_balance, total_earnings, pix_key')
                .eq('user_id', user.id)
                .eq('organization_id', ORGANIZATION_ID)
                .limit(1);

            if (settingsError) throw settingsError;
            
            const settings = settingsData?.[0] || null;
            if (!settings) {
                setLoading(false);
                return;
            }

            // 2. Fetch Withdrawal History
            const { data: withdrawData, error: withdrawError } = await supabase
                .from('withdrawals')
                .select('*')
                .eq('user_id', user.id)
                .eq('organization_id', ORGANIZATION_ID)
                .order('created_at', { ascending: false });

            if (withdrawError) throw withdrawError;

            // 3. Calculate Withdrawn amount (statuses: Pago / paid / completed)
            const totalWithdrawn = (withdrawData || [])
                .filter(w => ['completed', 'paid', 'Pago'].includes(w.status))
                .reduce((acc, curr) => acc + Number(curr.amount_requested), 0);

            setBalance({
                total: Number(settings.total_earnings || 0),
                available: Number(settings.available_balance || 0),
                frozen: Number(settings.frozen_balance || 0),
                withdrawn: totalWithdrawn
            });

            setWithdrawals(withdrawData || []);
            setPixKey(settings.pix_key || 'Não cadastrada');
            setNewPixKey(settings.pix_key || '');

        } catch (error) {
            console.error('Erro ao buscar dados financeiros:', error);
            toast.error('Erro ao carregar dados financeiros.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFinancialData();
    }, [user]);

    const handleUpdatePix = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newPixKey.trim()) {
            toast.error('Informe uma chave PIX válida.');
            return;
        }

        try {
            setSubmitting(true);
            const { error } = await supabase
                .from('user_settings')
                .update({ pix_key: newPixKey.trim() })
                .eq('user_id', user?.id)
                .eq('organization_id', ORGANIZATION_ID);

            if (error) throw error;

            toast.success('Chave PIX atualizada!');
            setPixKey(newPixKey.trim());
            setShowPixModal(false);
        } catch (error) {
            console.error('Erro ao atualizar PIX:', error);
            toast.error('Erro ao atualizar chave PIX.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRequestWithdrawal = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // 1. Enforçar regra de segunda-feira
        const today = new Date().getDay(); // 0 = Domingo, 1 = Segunda, ...
        if (today !== 1) {
            toast.error('As solicitações de saque são permitidas apenas às segundas-feiras.');
            return;
        }

        if (pixKey === 'Não cadastrada') {
            toast.error('Cadastre uma chave PIX antes de solicitar o saque.');
            return;
        }

        const amount = Number(withdrawAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error('Informe um valor de saque válido.');
            return;
        }

        if (amount > balance.available) {
            toast.error('Saldo disponível insuficiente.');
            return;
        }

        try {
            setSubmitting(true);

            // 2. Criar a solicitação de saque (status: 'Pendente')
            const { error: withdrawErr } = await supabase
                .from('withdrawals')
                .insert({
                    user_id: user?.id,
                    amount_requested: amount,
                    net_amount: amount,
                    status: 'Pendente',
                    pix_key: pixKey,
                    organization_id: ORGANIZATION_ID
                });

            if (withdrawErr) throw withdrawErr;

            // 3. Deduzir o valor solicitado do saldo disponível
            const { error: balanceErr } = await supabase
                .from('user_settings')
                .update({
                    available_balance: balance.available - amount
                })
                .eq('user_id', user?.id)
                .eq('organization_id', ORGANIZATION_ID);

            if (balanceErr) throw balanceErr;

            toast.success('Solicitação de saque enviada com sucesso!');
            setShowWithdrawModal(false);
            setWithdrawAmount('');
            fetchFinancialData();

        } catch (err) {
            console.error('Erro ao solicitar saque:', err);
            toast.error('Erro ao processar solicitação de saque.');
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return {
            day: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
            time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        };
    };

    const isMonday = new Date().getDay() === 1;

    const stats = [
        { label: 'Saldo Total', value: formatCurrency(balance.total), icon: DollarSign, color: 'text-slate-800', bg: 'bg-slate-100' },
        { label: 'Saldo Disponível', value: formatCurrency(balance.available), icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Saldo Bloqueado', value: formatCurrency(balance.frozen), icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
        { label: 'Total Sacado', value: formatCurrency(balance.withdrawn), icon: CheckCircle, color: 'text-purple-500', bg: 'bg-purple-50' },
    ];

    return (
        <AffiliateLayout>
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-[#0B1221]">Financeiro</h1>
                    <p className="text-slate-500 font-medium font-inter">Acompanhe seus rendimentos e solicite saques.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setShowWithdrawModal(true)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 px-6 rounded-2xl transition-all w-full md:w-auto shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                    >
                        <PlusCircle className="w-5 h-5" />
                        Solicitar Saque
                    </button>
                    <button
                        onClick={fetchFinancialData}
                        className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-emerald-500 transition-all flex items-center justify-center shadow-sm"
                    >
                        <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {stats.map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 transition-all hover:shadow-lg">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                        </div>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest font-inter">{stat.label}</p>
                        <h3 className="text-2xl font-black text-[#0B1221] mt-1">
                            {loading ? <span className="animate-pulse">...</span> : stat.value}
                        </h3>
                    </div>
                ))}
            </div>

            {/* Tables and Main Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Transactions Table */}
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-8 md:p-10 border-b border-slate-50 flex justify-between items-center">
                        <h3 className="text-xl font-black text-[#0B1221]">Histórico de Saques</h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="text-left py-5 px-8 text-xs font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                                    <th className="text-left py-5 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Data</th>
                                    <th className="text-left py-5 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Valor</th>
                                    <th className="text-right py-5 px-8 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 font-inter">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                                            Carregando histórico...
                                        </td>
                                    </tr>
                                ) : withdrawals.length > 0 ? (
                                    withdrawals.map((item) => (
                                        <tr key={item.id} className="group hover:bg-slate-50/30 transition-colors">
                                            <td className="py-6 px-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 text-slate-500">
                                                        <ArrowDownLeft className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-[#0B1221]">Saque PIX solicitado</span>
                                                        {item.proof_url && (
                                                            <a 
                                                                href={item.proof_url} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:underline flex items-center gap-1 mt-1"
                                                            >
                                                                <CreditCard className="w-3 h-3" /> Ver Comprovante
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-6 px-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-[#0B1221]">{formatDate(item.created_at).day}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium uppercase">{formatDate(item.created_at).time}</span>
                                                </div>
                                            </td>
                                            <td className="py-6 px-4">
                                                <span className="font-black text-red-500">
                                                    - {formatCurrency(item.amount_requested)}
                                                </span>
                                            </td>
                                            <td className="py-6 px-8 text-right">
                                                <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${
                                                    ['completed', 'paid', 'Pago', 'Aprovado'].includes(item.status) ? 'bg-emerald-50 text-emerald-600' :
                                                    ['pending', 'Pendente', 'Em análise'].includes(item.status) ? 'bg-amber-50 text-amber-600' : 
                                                    'bg-red-50 text-red-600'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="py-20 text-center text-slate-400 font-bold">
                                            Nenhum saque solicitado até o momento.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Info Sidebar */}
                <div className="space-y-8">
                    {/* PIX Key Box */}
                    <div className="bg-[#0B1221] rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl">
                        <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/10 blur-2xl rounded-full"></div>
                        <div className="flex items-center gap-3 mb-6 relative z-10">
                            <div className="p-2 bg-white/10 rounded-lg">
                                <CreditCard className="w-5 h-5 text-emerald-400" />
                            </div>
                            <h3 className="font-black">Dados de Recebimento</h3>
                        </div>

                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 relative z-10 font-inter">Chave PIX Cadastrada</p>
                        <p className="font-bold text-lg mb-6 overflow-hidden text-ellipsis relative z-10 font-mono">{pixKey}</p>

                        <button
                            onClick={() => {
                                setNewPixKey(pixKey === 'Não cadastrada' ? '' : pixKey);
                                setShowPixModal(true);
                            }}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-bold transition-all text-sm relative z-10 shadow-lg shadow-emerald-500/10 border-none"
                        >
                            ALTERAR CHAVE PIX
                        </button>
                    </div>

                    {/* Rules/Info Box */}
                    <div className="bg-slate-150 border border-slate-200/50 rounded-[2.5rem] p-8">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-black text-[#0B1221] text-sm mb-2">Regras de Saque CELD</h4>
                                <ul className="text-xs text-slate-500 font-medium space-y-3 font-inter leading-relaxed">
                                    <li className="flex gap-2">
                                        <span className="text-emerald-500">■</span> 
                                        <span>Solicitações permitidas apenas às **segundas-feiras**.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-emerald-500">■</span> 
                                        <span>Processamento e pagamento efetuados até a **sexta-feira** da mesma semana.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-emerald-500">■</span> 
                                        <span>Valores transferidos diretamente para a chave PIX informada.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PIX Modal */}
            {showPixModal && (
                <div className="fixed inset-0 bg-[#0B1221]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in fade-in zoom-in duration-300">
                        <h3 className="text-2xl font-black text-[#0B1221] mb-2">Atualizar Chave PIX</h3>
                        <p className="text-slate-500 text-sm mb-8 font-medium font-inter">Informe sua chave PIX para recebimento das comissões.</p>

                        <form onSubmit={handleUpdatePix} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 font-inter">Nova Chave PIX</label>
                                <input
                                    type="text"
                                    placeholder="CPF, E-mail, Celular ou Chave Aleatória"
                                    required
                                    value={newPixKey}
                                    onChange={(e) => setNewPixKey(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:border-emerald-500 transition-all font-bold font-mono text-slate-700"
                                />
                                <p className="text-[10px] text-slate-400 font-bold ml-1 uppercase tracking-wider font-inter">Certifique-se de que a chave está correta.</p>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => setShowPixModal(false)}
                                    className="flex-1 bg-slate-50 hover:bg-slate-100 py-4 rounded-2xl font-black text-slate-500 transition-all disabled:opacity-50"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 py-4 rounded-2xl font-black text-white transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {submitting && <Clock className="w-4 h-4 animate-spin" />}
                                    {submitting ? 'SALVANDO...' : 'SALVAR'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Withdraw Modal */}
            {showWithdrawModal && (
                <div className="fixed inset-0 bg-[#0B1221]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in fade-in zoom-in duration-300">
                        <h3 className="text-2xl font-black text-[#0B1221] mb-2">Solicitar Saque</h3>
                        
                        {!isMonday ? (
                            <div className="mt-6 p-6 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                                <p className="text-sm font-bold text-amber-900 leading-relaxed font-inter">
                                    Solicitações de saque CELD estão disponíveis apenas às **segundas-feiras**.
                                </p>
                                <p className="text-xs text-amber-800/80 mt-2 font-inter">
                                    Hoje é {new Date().toLocaleDateString('pt-BR', { weekday: 'long' })}. Por favor, retorne na próxima segunda-feira.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setShowWithdrawModal(false)}
                                    className="mt-6 w-full bg-slate-900 text-white font-black py-4 rounded-xl text-xs uppercase tracking-wider hover:bg-slate-800 transition-all"
                                >
                                    Entendido
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleRequestWithdrawal} className="space-y-6 mt-6">
                                <p className="text-slate-500 text-sm font-medium font-inter">
                                    Solicite a transferência do seu saldo disponível para a sua chave PIX: <strong className="font-mono">{pixKey}</strong>
                                </p>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 font-inter">Valor a Sacar</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="1"
                                        max={balance.available}
                                        placeholder={`Máximo: ${formatCurrency(balance.available)}`}
                                        required
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:border-emerald-500 transition-all font-black text-slate-700"
                                    />
                                    <p className="text-[10px] text-slate-400 font-bold ml-1 uppercase tracking-wider font-inter">
                                        Saldo Disponível: {formatCurrency(balance.available)}
                                    </p>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        disabled={submitting}
                                        onClick={() => setShowWithdrawModal(false)}
                                        className="flex-1 bg-slate-50 hover:bg-slate-100 py-4 rounded-2xl font-black text-slate-500 transition-all disabled:opacity-50"
                                    >
                                        CANCELAR
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 py-4 rounded-2xl font-black text-white transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {submitting ? 'ENVIANDO...' : 'SOLICITAR'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </AffiliateLayout>
    );
};

export default AffiliateFinancial;

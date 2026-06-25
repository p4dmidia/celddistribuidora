import React, { useState, useEffect } from 'react';
import {
    Users,
    Wallet,
    TrendingUp,
    Copy,
    CheckCircle,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    ExternalLink,
    Calendar,
    ShieldAlert,
    HelpCircle,
    UserCheck,
    UserX,
    Loader2
} from 'lucide-react';
import { ORGANIZATION_ID } from '../lib/config';
import { useNavigate } from 'react-router-dom';
import AffiliateLayout from '../components/AffiliateLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import toast from 'react-hot-toast';

const AffiliateDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [affiliateData, setAffiliateData] = useState<any>(null);
    const [walletData, setWalletData] = useState<any>(null);
    const [monthEarnings, setMonthEarnings] = useState(0);
    const [recentReferrals, setRecentReferrals] = useState<any[]>([]);
    const [recentCommissions, setRecentCommissions] = useState<any[]>([]);
    const [copied, setCopied] = useState(false);
    
    // Network Stats
    const [totalNetwork, setTotalNetwork] = useState(0);
    const [activeNetwork, setActiveNetwork] = useState(0);
    const [inactiveNetwork, setInactiveNetwork] = useState(0);

    const handleAutoLink = async () => {
        try {
            console.log('Iniciando auto-vínculo para o usuário...');
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user?.id)
                .single();

            const login = user?.email?.split('@')[0] || 'afiliado';
            const randomSuffix = Math.random().toString(36).substring(2, 6);
            
            const { error: insErr } = await supabase
                .from('affiliates')
                .insert({
                    user_id: user?.id,
                    email: user?.email,
                    full_name: profile?.full_name || 'Novo Afiliado',
                    referral_code: `${login}_${randomSuffix}`.toLowerCase(),
                    organization_id: ORGANIZATION_ID,
                    is_active: true,
                    is_verified: true
                });

            if (insErr) throw insErr;
            return true;
        } catch (err) {
            console.error('Erro no auto-vínculo:', err);
            return false;
        }
    };

    const fetchDashboardData = async () => {
        if (!user) return;

        try {
            setLoading(true);

            // 1. Buscar dados do Afiliado para a organização CELD
            const { data: affData, error: affErr } = await supabase
                .from('affiliates')
                .select('*')
                .eq('user_id', user.id)
                .eq('organization_id', ORGANIZATION_ID)
                .limit(1);

            if (affErr) throw affErr;
            
            const aff = affData?.[0] || null;
            if (!aff) {
                const success = await handleAutoLink();
                if (success) {
                    return fetchDashboardData();
                }
                setAffiliateData(null);
                setLoading(false);
                return;
            }

            setAffiliateData(aff);

            // 2. Buscar dados de Carteira (disponível, bloqueado, total)
            const { data: walletList, error: walletErr } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', user.id)
                .eq('organization_id', ORGANIZATION_ID)
                .limit(1);

            if (!walletErr && walletList && walletList.length > 0) {
                setWalletData(walletList[0]);
            }

            // 3. Buscar comissão do mês (soma do mês corrente)
            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const { data: monthComms } = await supabase
                .from('commissions')
                .select('amount')
                .eq('user_id', user.id)
                .eq('organization_id', ORGANIZATION_ID)
                .gte('created_at', firstDayOfMonth);

            if (monthComms) {
                const totalMonth = monthComms.reduce((sum, item) => sum + Number(item.amount), 0);
                setMonthEarnings(totalMonth);
            }

            // 4. Buscar últimas comissões
            const { data: comms } = await supabase
                .from('commissions')
                .select('id, amount, level, created_at, description')
                .eq('user_id', user.id)
                .eq('organization_id', ORGANIZATION_ID)
                .order('created_at', { ascending: false })
                .limit(5);
            setRecentCommissions(comms || []);

            // 5. Buscar últimos indicados diretos
            const { data: recent } = await supabase
                .from('affiliates')
                .select('id, full_name, created_at, is_active, active_until')
                .eq('sponsor_id', aff.id)
                .eq('organization_id', ORGANIZATION_ID)
                .order('created_at', { ascending: false })
                .limit(5);
            setRecentReferrals(recent || []);

            // 6. Contagem recursiva de rede (Unilevel 10 níveis)
            const { data: allAffs, error: allAffsErr } = await supabase
                .from('affiliates')
                .select('id, sponsor_id, active_until, is_active')
                .eq('organization_id', ORGANIZATION_ID);

            if (!allAffsErr && allAffs) {
                let totalCount = 0;
                let activeCount = 0;
                let inactiveCount = 0;

                const countChildren = (parentId: string, currentLevel: number) => {
                    if (currentLevel > 10) return;
                    const children = allAffs.filter(a => a.sponsor_id === parentId);
                    children.forEach(child => {
                        totalCount++;
                        const isChildActive = child.active_until 
                            ? new Date(child.active_until) >= new Date() 
                            : child.is_active;

                        if (isChildActive) {
                            activeCount++;
                        } else {
                            inactiveCount++;
                        }
                        countChildren(child.id, currentLevel + 1);
                    });
                };

                countChildren(aff.id, 1);
                setTotalNetwork(totalCount);
                setActiveNetwork(activeCount);
                setInactiveNetwork(inactiveCount);
            }

        } catch (err) {
            console.error('Erro ao carregar dados do dashboard:', err);
            toast.error('Não foi possível carregar alguns dados.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [user]);

    const userLogin = affiliateData?.referral_code || "...";
    const domain = window.location.origin;
    const affiliateLink = `${domain}/ref/${userLogin.toLowerCase()}`;

    const handleCopyLink = () => {
        if (userLogin === "...") return;
        navigator.clipboard.writeText(affiliateLink);
        setCopied(true);
        toast.success('Link copiado!');
        setTimeout(() => setCopied(false), 2000);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const handleSupportWhatsApp = () => {
        window.open('https://api.whatsapp.com/send/?phone=5593992272032&text=Ol%C3%A1%2C+preciso+de+suporte+CELD%2C+pode+me+ajudar%3F&type=phone_number&app_absent=0', '_blank');
    };

    // Calcular data de vencimento e status de ativação
    const isAccountActive = affiliateData?.active_until 
        ? new Date(affiliateData.active_until) >= new Date()
        : affiliateData?.is_active;

    const expirationDateFormatted = affiliateData?.active_until
        ? new Date(affiliateData.active_until).toLocaleDateString('pt-BR')
        : 'Pendente';

    if (loading) {
        return (
            <AffiliateLayout>
                <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando painel...</p>
                </div>
            </AffiliateLayout>
        );
    }

    if (!affiliateData) {
        return (
            <AffiliateLayout>
                <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center px-4">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                        <ShieldAlert className="w-10 h-10" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-[#0B1221]">Perfil não identificado</h2>
                        <p className="text-slate-500 mt-2 max-w-md">Seu cadastro de afiliado CELD não foi detectado no sistema.</p>
                    </div>
                    <button 
                        onClick={() => window.location.reload()}
                        className="bg-emerald-500 text-white px-8 py-3 rounded-2xl font-black hover:bg-emerald-600 transition-all uppercase text-xs tracking-widest shadow-lg shadow-emerald-200"
                    >
                        Tentar Novamente
                    </button>
                </div>
            </AffiliateLayout>
        );
    }

    return (
        <AffiliateLayout>
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-[#0B1221]">Olá, {affiliateData?.full_name?.split(' ')[0] || 'Afiliado'}!</h1>
                    <p className="text-slate-500 font-medium font-inter">Bem-vindo ao seu escritório virtual CELD Distribuidora.</p>
                </div>
                <button
                    onClick={() => navigate('/shop')}
                    className="bg-white border border-slate-200 px-6 py-3 rounded-2xl flex items-center gap-2 font-bold text-slate-700 shadow-sm hover:shadow-md transition-all uppercase text-xs tracking-widest"
                >
                    <ExternalLink className="w-4 h-4 text-emerald-500" />
                    Ir para a Loja
                </button>
            </header>

            {/* Aviso de Conta Inativa */}
            {!isAccountActive && (
                <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="p-6 md:p-8 rounded-[2.5rem] border bg-amber-50 border-amber-100 flex flex-col lg:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 bg-amber-500 text-white shadow-xl shadow-amber-200">
                                <Clock className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl md:text-2xl font-black text-amber-900">
                                    Mensalidade Pendente (Inativo)
                                </h3>
                                <p className="font-medium mt-1 text-amber-800/80 font-inter">
                                    Sua conta CELD está inativa. Realize a compra da cesta básica mensal de R$ 300,00 para restabelecer seus bônus e recebimentos.
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => navigate('/shop')}
                            className="w-full lg:w-auto px-10 py-5 rounded-2xl font-black text-xs md:text-sm transition-all whitespace-nowrap shadow-xl uppercase tracking-widest bg-[#0B1221] text-white hover:bg-slate-800 shadow-slate-200"
                        >
                            ATIVAR MINHA CONTA AGORA
                        </button>
                    </div>
                </div>
            )}

            {/* 4 Cards de Métricas Principais (CELD Rebranded) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {/* Saldo Disponível */}
                <div className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-[0_20px_50px_rgba(0,0,0,0.03)] transition-all group overflow-hidden relative">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-slate-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 transform scale-0 group-hover:scale-100"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-500 group-hover:scale-110 transition-transform duration-500">
                                <Wallet className="w-6 h-6" />
                            </div>
                            <div className="flex items-center text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-full uppercase tracking-widest">
                                <ArrowUpRight className="w-3 h-3 mr-1" />
                                Disponível
                            </div>
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none mb-2 font-inter">Saldo Disponível</p>
                        <h3 className="text-2xl font-black text-[#0B1221]">{formatCurrency(walletData?.available_balance || 0)}</h3>
                    </div>
                </div>

                {/* Saldo Bloqueado */}
                <div className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-[0_20px_50px_rgba(0,0,0,0.03)] transition-all group overflow-hidden relative">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-slate-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 transform scale-0 group-hover:scale-100"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 rounded-2xl bg-amber-50 text-amber-500 group-hover:scale-110 transition-transform duration-500">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div className="flex items-center text-[10px] font-black text-amber-500 bg-amber-50 px-3 py-1.5 rounded-full uppercase tracking-widest">
                                <Clock className="w-3 h-3 mr-1" />
                                Bloqueado
                            </div>
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none mb-2 font-inter">Saldo Bloqueado</p>
                        <h3 className="text-2xl font-black text-[#0B1221]">{formatCurrency(walletData?.frozen_balance || 0)}</h3>
                    </div>
                </div>

                {/* Comissão do Mês */}
                <div className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-[0_20px_50px_rgba(0,0,0,0.03)] transition-all group overflow-hidden relative">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-slate-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 transform scale-0 group-hover:scale-100"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 rounded-2xl bg-blue-50 text-blue-500 group-hover:scale-110 transition-transform duration-500">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div className="flex items-center text-[10px] font-black text-blue-500 bg-blue-50 px-3 py-1.5 rounded-full uppercase tracking-widest">
                                <Calendar className="w-3 h-3 mr-1" />
                                Mensal
                            </div>
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none mb-2 font-inter">Comissão do Mês</p>
                        <h3 className="text-2xl font-black text-[#0B1221]">{formatCurrency(monthEarnings)}</h3>
                    </div>
                </div>

                {/* Comissão Total */}
                <div className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-[0_20px_50px_rgba(0,0,0,0.03)] transition-all group overflow-hidden relative">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-slate-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 transform scale-0 group-hover:scale-100"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 rounded-2xl bg-purple-50 text-purple-500 group-hover:scale-110 transition-transform duration-500">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div className="flex items-center text-[10px] font-black text-purple-500 bg-purple-50 px-3 py-1.5 rounded-full uppercase tracking-widest">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                Acumulado
                            </div>
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none mb-2 font-inter">Comissão Total</p>
                        <h3 className="text-2xl font-black text-[#0B1221]">{formatCurrency(walletData?.total_earnings || 0)}</h3>
                    </div>
                </div>
            </div>

            {/* Segunda Fileira do Dashboard (Rede e Link) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Rede Ativa / Rede Inativa Indicators */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Card Indicados Ativos */}
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
                                    <UserCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-widest font-inter">Rede Ativa</h4>
                                    <p className="text-2xl font-black text-[#0B1221] mt-1">{activeNetwork} afiliados</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-widest">Ativos</span>
                        </div>

                        {/* Card Indicados Inativos */}
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shadow-sm">
                                    <UserX className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-widest font-inter">Rede Inativa</h4>
                                    <p className="text-2xl font-black text-[#0B1221] mt-1">{inactiveNetwork} afiliados</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-black text-red-500 bg-red-50 px-2.5 py-1 rounded-full uppercase tracking-widest">Inativos</span>
                        </div>
                    </div>

                    {/* Links de Indicação (Rebranded CELD) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-[#0B1221] rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl flex flex-col justify-between">
                            <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full"></div>
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
                                    <Users className="w-6 h-6 text-emerald-400" />
                                </div>
                                <h2 className="text-2xl font-black mb-1">Indicação Direta</h2>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-8 font-inter">Cadastre novos clientes na sua rede.</p>
                                <div className="space-y-4">
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-slate-300 text-xs font-medium break-all font-mono leading-relaxed">
                                        {affiliateLink}
                                    </div>
                                    <button
                                        onClick={handleCopyLink}
                                        className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/10"
                                    >
                                        {copied ? 'COPIADO!' : 'COPIAR LINK'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[3rem] p-10 text-[#0B1221] relative overflow-hidden shadow-sm border border-slate-100 flex flex-col justify-between">
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
                                    <TrendingUp className="w-6 h-6 text-emerald-500" />
                                </div>
                                <h2 className="text-2xl font-black mb-1">Painel da Rede</h2>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-8 font-inter">Gerencie sua equipe unilevel.</p>
                                <div className="space-y-4">
                                    <p className="text-slate-500 text-xs leading-relaxed font-inter mb-6">
                                        Acompanhe a sua árvore de rede, as gerações indiretas de indicações e visualize o status de cada afiliado.
                                    </p>
                                    <button
                                        onClick={() => navigate('/dashboard/referrals')}
                                        className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
                                    >
                                        VISUALIZAR MINHA REDE
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Comissões Recentes */}
                    <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-10 border-b border-slate-50 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-[#0B1221]">Comissões Recentes</h3>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1 font-inter">Histórico de rendimentos</p>
                            </div>
                            <button onClick={() => navigate('/dashboard/financial')} className="text-emerald-500 font-black text-[10px] uppercase tracking-widest hover:underline flex items-center gap-1">
                                Ver extrato <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50/50 text-left">
                                        <th className="py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Descrição / Data</th>
                                        <th className="py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Nível</th>
                                        <th className="py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-right">Rendimento</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {recentCommissions.length > 0 ? (
                                        recentCommissions.map((comm) => (
                                            <tr key={comm.id} className="group hover:bg-slate-50/30 transition-all">
                                                <td className="py-6 px-10">
                                                    <div className="font-black text-[#0B1221] text-sm">{comm.description}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase font-inter">{new Date(comm.created_at).toLocaleDateString('pt-BR')} às {new Date(comm.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                                                </td>
                                                <td className="py-6 px-4">
                                                    <span className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl font-black text-[10px] tracking-widest">
                                                        NÍVEL {comm.level}
                                                    </span>
                                                </td>
                                                <td className="py-6 px-10 text-right font-black text-emerald-500 text-base">
                                                    {formatCurrency(comm.amount)}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={3} className="py-20 text-center">
                                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                    <TrendingUp className="w-8 h-8 text-slate-200" />
                                                </div>
                                                <p className="font-bold text-slate-400 font-inter">Nenhuma comissão registrada ainda.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Column: User Profile details & Help Center */}
                <div className="space-y-8">
                    <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 p-10 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
                        <div className="w-32 h-32 rounded-[2.5rem] bg-slate-50 mx-auto mb-6 p-1 border border-slate-100 shadow-sm overflow-hidden flex items-center justify-center">
                             <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${affiliateData?.full_name || 'A'}`} alt="Avatar" className="w-full h-full object-cover rounded-2xl" />
                        </div>
                        
                        <span className={`inline-block px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-4 shadow-sm ${isAccountActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                            Status: {isAccountActive ? 'Ativo' : 'Inativo'}
                        </span>
                        
                        <h3 className="text-2xl font-black text-[#0B1221]">{affiliateData?.full_name || 'Afiliado'}</h3>
                        <p className="text-slate-400 font-bold text-xs mt-1 uppercase tracking-widest font-mono">{affiliateData?.referral_code}</p>
                        
                        <div className="mt-8 pt-8 border-t border-slate-50 text-left space-y-4">
                            <div className="flex justify-between items-center text-sm font-semibold">
                                <span className="text-slate-400 font-inter">Próximo Vencimento:</span>
                                <span className="text-[#0B1221] font-mono flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-emerald-500" />
                                    {expirationDateFormatted}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-semibold">
                                <span className="text-slate-400 font-inter">Indicados na Rede:</span>
                                <span className="text-[#0B1221] font-mono">{totalNetwork}</span>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-slate-50 grid grid-cols-2 gap-4">
                            <div className="text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-inter">Time Ativo</p>
                                <p className="text-xl font-black text-emerald-500">{activeNetwork}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-inter">Saldo Disp.</p>
                                <p className="text-xl font-black text-emerald-500 truncate">{formatCurrency(walletData?.available_balance || 0)}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => navigate('/dashboard/referrals')}
                            className="w-full mt-10 bg-[#0B1221] hover:bg-slate-800 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-200"
                        >
                            MINHA REDE
                        </button>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-xl shadow-emerald-100 group">
                        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                        <h3 className="text-2xl font-black mb-1 relative z-10">Central de Ajuda</h3>
                        <p className="text-white/80 font-medium text-sm mb-8 relative z-10 leading-relaxed font-inter">Dúvidas sobre o sistema? Nossa equipe está pronta para te ajudar via WhatsApp.</p>
                        <button onClick={handleSupportWhatsApp} className="w-full bg-white text-emerald-600 hover:bg-slate-900 hover:text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg relative z-10">
                            FALAR NO WHATSAPP
                        </button>
                    </div>
                </div>
            </div>
        </AffiliateLayout>
    );
};

export default AffiliateDashboard;

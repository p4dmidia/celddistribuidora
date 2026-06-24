import React, { useState, useEffect } from 'react';
import {
    Users,
    Search,
    CheckCircle,
    XCircle,
    Clock,
    Network,
    List,
    Layers,
    UserCheck,
    Loader2
} from 'lucide-react';
import AffiliateLayout from '../components/AffiliateLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import toast from 'react-hot-toast';
import { AffiliateNetwork } from '../components/AffiliateNetwork';
import { ORGANIZATION_ID } from '../lib/config';

interface Referral {
    id: string;
    full_name: string;
    email: string;
    created_at: string;
    is_active: boolean;
    status: string;
    active_until: string | null;
}

interface UnilevelMember {
    id: string;
    full_name: string;
    email: string;
    created_at: string;
    level: number;
    active_until: string | null;
    is_active: boolean;
}

const AffiliateReferrals: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    
    // Referral views states
    const [viewMode, setViewMode] = useState<'patrocinio' | 'unilevel' | 'genealogica'>('patrocinio');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [affiliateId, setAffiliateId] = useState<string | null>(null);
    
    // Lists states
    const [directReferrals, setDirectReferrals] = useState<Referral[]>([]);
    const [unilevelReferrals, setUnilevelReferrals] = useState<UnilevelMember[]>([]);

    // Stats
    const [totalDirects, setTotalDirects] = useState(0);
    const [activeDirects, setActiveDirects] = useState(0);
    const [inactiveDirects, setInactiveDirects] = useState(0);
    const [totalUnilevel, setTotalUnilevel] = useState(0);

    const fetchReferrals = async () => {
        if (!user) return;
        
        try {
            setLoading(true);

            // 1. Pegar o ID de afiliado do usuário logado
            const { data: affList, error: affError } = await supabase
                .from('affiliates')
                .select('id')
                .eq('user_id', user.id)
                .eq('organization_id', ORGANIZATION_ID)
                .limit(1);

            if (affError) throw affError;
            
            const affData = affList?.[0] || null;
            if (!affData) {
                setDirectReferrals([]);
                setUnilevelReferrals([]);
                setLoading(false);
                return;
            }
            
            setAffiliateId(affData.id);

            // 2. Buscar indicações diretas (Nível 1)
            const { data: directData, error: directErr } = await supabase
                .from('affiliates')
                .select('*')
                .eq('sponsor_id', affData.id)
                .eq('organization_id', ORGANIZATION_ID)
                .order('created_at', { ascending: false });

            if (directErr) throw directErr;

            const formattedDirects = (directData || []).map(ref => {
                const isActive = ref.active_until 
                    ? new Date(ref.active_until) >= new Date() 
                    : ref.is_active;
                return {
                    ...ref,
                    is_active: isActive,
                    status: isActive ? 'Ativo' : 'Inativo'
                };
            });

            setDirectReferrals(formattedDirects);

            // Calcular estatísticas diretas
            const activeCount = formattedDirects.filter(r => r.is_active).length;
            setTotalDirects(formattedDirects.length);
            setActiveDirects(activeCount);
            setInactiveDirects(formattedDirects.length - activeCount);

            // 3. Buscar todas as indicações da rede (para montar o unilevel de 10 níveis)
            const { data: allAffs, error: allAffsErr } = await supabase
                .from('affiliates')
                .select('id, full_name, email, sponsor_id, created_at, active_until, is_active')
                .eq('organization_id', ORGANIZATION_ID);

            if (!allAffsErr && allAffs) {
                const list: UnilevelMember[] = [];
                const traverse = (parentId: string, currentLevel: number) => {
                    if (currentLevel > 10) return;
                    const children = allAffs.filter(a => a.sponsor_id === parentId);
                    children.forEach(child => {
                        const isActive = child.active_until 
                            ? new Date(child.active_until) >= new Date() 
                            : child.is_active;

                        list.push({
                            id: child.id,
                            full_name: child.full_name,
                            email: child.email,
                            created_at: child.created_at,
                            level: currentLevel,
                            active_until: child.active_until,
                            is_active: isActive
                        });
                        traverse(child.id, currentLevel + 1);
                    });
                };
                traverse(affData.id, 1);
                
                // Ordenar por nível crescente, e depois por data decrescente
                list.sort((a, b) => {
                    if (a.level !== b.level) return a.level - b.level;
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                });
                
                setUnilevelReferrals(list);
                setTotalUnilevel(list.length);
            }

        } catch (error) {
            console.error('Erro ao buscar rede de indicações:', error);
            toast.error('Erro ao carregar os dados da sua rede.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReferrals();
    }, [user]);

    // Filtros aplicados sobre a aba ativa
    const filteredDirects = directReferrals.filter(ref => {
        const matchesSearch = ref.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ref.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'Todos' || ref.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const filteredUnilevel = unilevelReferrals.filter(ref => {
        const matchesSearch = ref.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ref.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'Todos' || 
            (statusFilter === 'Ativo' && ref.is_active) || 
            (statusFilter === 'Inativo' && !ref.is_active);
        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <AffiliateLayout>
                <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando rede...</p>
                </div>
            </AffiliateLayout>
        );
    }

    return (
        <AffiliateLayout>
            <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-[#0B1221]">Rede de Afiliados</h1>
                    <p className="text-slate-500 font-medium font-inter">Gerencie seus indicados e acompanhe o crescimento da sua rede unilevel.</p>
                </div>
                
                {/* Abas de Visualização CELD */}
                <div className="flex items-center gap-3">
                    <div className="bg-white p-1.5 rounded-2xl border border-slate-200 flex gap-1 shadow-sm">
                        <button
                            onClick={() => setViewMode('patrocinio')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${viewMode === 'patrocinio' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10' : 'text-slate-400 hover:text-slate-800'}`}
                        >
                            <List className="w-4 h-4" />
                            Patrocínio Direto
                        </button>
                        <button
                            onClick={() => setViewMode('unilevel')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${viewMode === 'unilevel' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10' : 'text-slate-400 hover:text-slate-800'}`}
                        >
                            <Layers className="w-4 h-4" />
                            Unilevel (10 Níveis)
                        </button>
                        <button
                            onClick={() => setViewMode('genealogica')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${viewMode === 'genealogica' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10' : 'text-slate-400 hover:text-slate-800'}`}
                        >
                            <Network className="w-4 h-4" />
                            Genealógica
                        </button>
                    </div>
                </div>
            </header>

            {/* Grid de Estatísticas Gerais da Rede */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3.5 bg-blue-50 text-blue-500 rounded-2xl">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest font-inter">Indicações Diretas</p>
                        <h3 className="text-xl font-black text-slate-800 mt-1">{totalDirects}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3.5 bg-emerald-50 text-emerald-500 rounded-2xl">
                        <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest font-inter">Diretos Ativos</p>
                        <h3 className="text-xl font-black text-slate-800 mt-1">{activeDirects}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3.5 bg-red-50 text-red-500 rounded-2xl">
                        <XCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest font-inter">Diretos Inativos</p>
                        <h3 className="text-xl font-black text-slate-800 mt-1">{inactiveDirects}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3.5 bg-purple-50 text-purple-500 rounded-2xl">
                        <Layers className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest font-inter">Total Rede Unilevel</p>
                        <h3 className="text-xl font-black text-slate-800 mt-1">{totalUnilevel}</h3>
                    </div>
                </div>
            </div>

            {/* Modo Genealógico */}
            {viewMode === 'genealogica' && affiliateId && (
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="mb-6 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-black text-[#0B1221]">Estrutura Genealógica</h3>
                            <p className="text-slate-400 text-xs font-medium font-inter">Visualização gráfica do posicionamento da rede.</p>
                        </div>
                    </div>
                    <AffiliateNetwork rootAffiliateId={affiliateId} />
                </div>
            )}

            {/* Listas (Patrocínio Direto ou Unilevel) */}
            {viewMode !== 'genealogica' && (
                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                    {/* Filtros e Busca */}
                    <div className="p-8 md:p-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-grow max-w-md relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nome ou e-mail..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-12 pr-4 text-sm outline-none focus:border-emerald-500 transition-all font-inter"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 font-inter">
                                Status:
                            </span>
                            <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200/50">
                                {['Todos', 'Ativo', 'Inativo'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setStatusFilter(status)}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === status ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-800'}`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Tabela de Resultados */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/50 text-left">
                                    <th className="py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">Afiliado</th>
                                    {viewMode === 'unilevel' && (
                                        <th className="py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nível / Geração</th>
                                    )}
                                    <th className="py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data de Cadastro</th>
                                    <th className="py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
                                    <th className="py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 font-inter">
                                {(viewMode === 'patrocinio' ? filteredDirects : filteredUnilevel).length > 0 ? (
                                    (viewMode === 'patrocinio' ? filteredDirects : filteredUnilevel).map((member) => (
                                        <tr key={member.id} className="group hover:bg-slate-50/30 transition-colors">
                                            {/* Informações Básicas */}
                                            <td className="py-6 px-10">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-slate-500 overflow-hidden uppercase">
                                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.email}`} alt={member.full_name} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div>
                                                        <div className="font-extrabold text-[#0B1221] text-sm">{member.full_name}</div>
                                                        <div className="text-xs text-slate-400 font-medium mt-0.5">{member.email}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Nível (Somente Unilevel) */}
                                            {viewMode === 'unilevel' && (
                                                <td className="py-6 px-4">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase ${
                                                        (member as UnilevelMember).level === 1 ? 'bg-blue-50 text-blue-600' :
                                                        (member as UnilevelMember).level === 2 ? 'bg-indigo-50 text-indigo-600' :
                                                        'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        Geração {(member as UnilevelMember).level}
                                                    </span>
                                                </td>
                                            )}

                                            {/* Data de Cadastro */}
                                            <td className="py-6 px-4 text-sm text-slate-500 font-medium">
                                                {new Date(member.created_at).toLocaleDateString('pt-BR')}
                                            </td>

                                            {/* Próximo Vencimento */}
                                            <td className="py-6 px-4 text-sm text-slate-500 font-medium font-mono">
                                                {member.active_until 
                                                    ? new Date(member.active_until).toLocaleDateString('pt-BR') 
                                                    : 'Não ativo'}
                                            </td>

                                            {/* Status */}
                                            <td className="py-6 px-10 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${
                                                    member.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                                                }`}>
                                                    {member.is_active ? (
                                                        <>
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                            Ativo
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircle className="w-3.5 h-3.5" />
                                                            Inativo
                                                        </>
                                                    )}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={viewMode === 'unilevel' ? 5 : 4} className="py-24 text-center">
                                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <Users className="w-8 h-8 text-slate-200" />
                                            </div>
                                            <p className="font-bold text-slate-400">Nenhum afiliado encontrado nesta visualização.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </AffiliateLayout>
    );
};

export default AffiliateReferrals;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle2,
    Send,
    User,
    Lock,
    Mail,
    AtSign,
    Phone,
    Briefcase,
    ShoppingCart,
    FileText,
    Download,
    Eye,
    EyeOff
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import { ORGANIZATION_ID } from '../lib/config';

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const [registrationType, setRegistrationType] = useState<'business' | 'sales' | null>('business');
    const [formData, setFormData] = useState({
        nome: '',
        sobrenome: '',
        login: '',
        email: '',
        senha: '',
        confirmarSenha: '',
        whatsapp: '',
        cpf: '',
        cnpj: '',
        aceiteContrato: false
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sponsorCode, setSponsorCode] = useState<string | null>(null);
    const [sponsorName, setSponsorName] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    React.useEffect(() => {
        // Tenta capturar o código do patrocinador do cookie
        const ref = Cookies.get('celd_ref') || Cookies.get('classea_ref');
        if (ref) {
            console.log('Sponsor detected from cookie:', ref);
            setSponsorCode(ref);
            fetchSponsorName(ref);
        }
    }, []);

    const fetchSponsorName = async (code: string) => {
        try {
            const { data, error } = await supabase
                .from('affiliates')
                .select('full_name')
                .ilike('referral_code', code)
                .maybeSingle();
            
            if (data && data.full_name) {
                setSponsorName(data.full_name);
            }
        } catch (err) {
            console.error('Error fetching sponsor name:', err);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        let finalValue = type === 'checkbox' ? checked : value;
        
        if (name === 'login') {
            // Remove any non-alphanumeric character and force lowercase
            finalValue = (value as string).toLowerCase().replace(/[^a-z0-9]/g, '');
        }

        setFormData(prev => ({
            ...prev,
            [name]: finalValue
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!registrationType) {
            setError('Por favor, selecione o tipo de cadastro.');
            return;
        }
        if (formData.senha !== formData.confirmarSenha) {
            setError('As senhas não coincidem.');
            return;
        }
        if (!formData.aceiteContrato) {
            setError('Você precisa aceitar os termos do contrato para prosseguir.');
            return;
        }

        if (!formData.cpf && !formData.cnpj) {
            setError('Por favor, informe o seu CPF ou CNPJ.');
            return;
        }

        setLoading(true);
        try {
            // 1. Verificar se o login já existe para evitar erro de trigger
            const { data: existingAff, error: checkError } = await supabase
                .from('affiliates')
                .select('id')
                .ilike('referral_code', formData.login)
                .eq('organization_id', ORGANIZATION_ID)
                .maybeSingle();
            
            if (existingAff) {
                setError('Este login já está em uso. Por favor, escolha outro.');
                setLoading(false);
                return;
            }

            const { data, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.senha,
                options: {
                    data: {
                        nome: formData.nome,
                        sobrenome: formData.sobrenome,
                        login: formData.login,
                        registration_type: registrationType,
                        sponsor_code: sponsorCode,
                        organization_id: ORGANIZATION_ID,
                        cpf: formData.cpf || null,
                        cnpj: formData.cnpj || null,
                        whatsapp: formData.whatsapp || null
                    }
                }
            });

            if (signUpError) throw signUpError;

            if (data?.user) {
                const newUser = data.user;
                console.log('User created successfully:', newUser.id);

                // Fallback de Segurança: Garantir que o perfil e o registro de afiliado existam
                // Isso resolve o problema de "Conta não vinculada" se o Trigger do banco falhar ou demorar.
                setTimeout(async () => {
                    try {
                        console.log('Iniciando verificação de integridade pós-cadastro...');
                        
                        // 1. Verificar se o registro de afiliado existe
                        const { data: affCheck } = await supabase
                            .from('affiliates')
                            .select('id')
                            .eq('user_id', newUser.id)
                            .maybeSingle();
                            
                        if (!affCheck) {
                            console.warn('Trigger do banco falhou para Affiliates. Criando registro manualmente...');
                            
                            // Buscar ID do patrocinador se houver código
                            let sponsorId = null;
                            if (sponsorCode) {
                                const { data: sData } = await supabase
                                    .from('affiliates')
                                    .select('id')
                                    .ilike('referral_code', sponsorCode)
                                    .maybeSingle();
                                sponsorId = sData?.id || null;
                            }

                            const { error: insErr } = await supabase
                                .from('affiliates')
                                .insert({
                                    user_id: newUser.id,
                                    email: formData.email,
                                    full_name: `${formData.nome} ${formData.sobrenome}`.trim() || 'Afiliado',
                                    referral_code: formData.login.toLowerCase(),
                                    whatsapp: formData.whatsapp,
                                    organization_id: ORGANIZATION_ID,
                                    sponsor_id: sponsorId,
                                    is_active: false,
                                    is_verified: true
                                });
                                
                            if (insErr) {
                                console.error('Erro ao criar afiliado manualmente:', insErr);
                                // Se for erro de duplicidade, tenta um login aleatório
                                if (insErr.code === '23505') {
                                    const randomSuffix = Math.random().toString(36).substring(2, 6);
                                    await supabase.from('affiliates').insert({
                                        user_id: newUser.id,
                                        email: formData.email,
                                        full_name: `${formData.nome} ${formData.sobrenome}`.trim() || 'Afiliado',
                                        referral_code: `${formData.login.toLowerCase()}_${randomSuffix}`,
                                        whatsapp: formData.whatsapp,
                                        organization_id: ORGANIZATION_ID,
                                        sponsor_id: sponsorId,
                                        is_active: false,
                                        is_verified: true
                                    });
                                }
                            } else console.log('Registro de afiliado criado com sucesso via fallback.');
                        } else {
                            console.log('Registro de afiliado já existe (Trigger funcionou).');
                        }

                        // 2. Garantir que o user_profile tenha os dados básicos e o sponsor_id (user_id do sponsor)
                        const { data: profCheck } = await supabase
                            .from('user_profiles')
                            .select('full_name, sponsor_id')
                            .eq('id', newUser.id)
                            .maybeSingle();

                        if (profCheck && (!profCheck.full_name || !profCheck.sponsor_id)) {
                            console.log('Atualizando perfil com dados faltantes...');
                            
                            let sponsorUserId = null;
                            if (sponsorCode) {
                                const { data: sUserData } = await supabase
                                    .from('affiliates')
                                    .select('user_id')
                                    .ilike('referral_code', sponsorCode)
                                    .maybeSingle();
                                sponsorUserId = sUserData?.user_id || null;
                            }

                            await supabase
                                .from('user_profiles')
                                .update({
                                    full_name: `${formData.nome} ${formData.sobrenome}`.trim(),
                                    sponsor_id: sponsorUserId,
                                    referrer_id: sponsorUserId,
                                    whatsapp: formData.whatsapp,
                                    login: formData.login.toLowerCase()
                                })
                                .eq('id', newUser.id);
                        }

                    } catch (fallbackErr) {
                        console.error('Erro no fallback de cadastro:', fallbackErr);
                    }
                }, 2000);

                toast.success('Cadastro realizado com sucesso! Bem-vindo à CELD Distribuidora.', {
                    duration: 5000,
                    style: {
                        background: '#0B1221',
                        color: '#fff',
                        fontWeight: 'bold',
                        borderRadius: '1rem',
                        border: '1px solid rgba(16, 185, 129, 0.2)'
                    },
                    iconTheme: {
                        primary: '#10b981',
                        secondary: '#0B1221',
                    },
                });

                // Redirecionar para login após um pequeno delay
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao realizar cadastro.');
            toast.error(err.message || 'Erro ao realizar cadastro.');
            console.error('Erro no cadastro:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white min-h-screen font-sans">
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-[#0B1221] py-16 lg:py-24">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-emerald-500/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
                <div className="container mx-auto px-4 relative z-10 text-center">
                    <span className="inline-block bg-emerald-500/20 text-emerald-400 text-[10px] font-black tracking-[0.2em] uppercase px-4 py-2 rounded-full mb-6">
                        Seja um Parceiro CELD
                    </span>
                    <h1 className="text-4xl md:text-6xl font-black text-white leading-tight">
                        Crie sua conta e comece <br />
                        <span className="text-emerald-500">sua jornada de sucesso</span>
                    </h1>
                </div>
            </section>

            {/* Registration Form Section */}
            <section className="py-20 -mt-16 relative z-20 pb-32">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto">
                        {sponsorName && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 mb-6 flex items-center justify-center gap-3 animate-bounce-subtle">
                                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                                    <User className="w-4 h-4" />
                                </div>
                                <p className="text-[#0B1221] font-black text-xs uppercase tracking-widest">
                                    Você está sendo indicada por <span className="text-emerald-500 bg-[#0B1221] px-2 py-0.5 rounded ml-1">{sponsorName}</span>
                                </p>
                            </div>
                        )}
                        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100">
                            <form onSubmit={handleSubmit}>
                                <div className="flex flex-col lg:flex-row">
                                    {/* Left Side: Benefits Information */}
                                    <div className="lg:w-1/3 bg-slate-50 p-8 lg:p-12 space-y-8 border-r border-slate-100">
                                        <div>
                                            <h3 className="text-xl font-black text-[#0B1221] mb-2">Parceiro CELD</h3>
                                            <p className="text-slate-500 text-xs font-medium">Seja um parceiro de negócios CELD Distribuidora.</p>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="flex items-start gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-xs text-[#0B1221] uppercase tracking-widest">Plano Único</p>
                                                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                                        Cesta básica mensal com produtos selecionados e de alta qualidade.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-xs text-[#0B1221] uppercase tracking-widest">Matriz 10 Níveis</p>
                                                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                                        Receba bonificação unilevel por compras em até 10 gerações da sua rede.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-xs text-[#0B1221] uppercase tracking-widest">Bônus Direto 10%</p>
                                                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                                        Ganhe 10% de bônus imediato por cada indicação direta ativada.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-8 border-t border-slate-200">
                                            <div className="flex items-center gap-3 text-emerald-500 bg-emerald-50 p-4 rounded-xl border border-emerald-100/50">
                                                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                                                <p className="text-[10px] font-black uppercase tracking-widest leading-none">Cadastro Gratuito</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side: Basic Info */}
                                    <div className="lg:w-2/3 p-8 lg:p-12 space-y-8">
                                        <div>
                                            <h3 className="text-2xl font-black text-[#0B1221] mb-2">Informações de Acesso</h3>
                                            <p className="text-slate-400 text-sm font-medium">Preencha os campos básicos solicitados.</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Nome</label>
                                                <div className="relative">
                                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                                    <input
                                                        type="text" name="nome" required
                                                        value={formData.nome} onChange={handleChange}
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-[#05080F] outline-none focus:border-emerald-500 transition-all"
                                                        placeholder="Ex: João"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Sobrenome</label>
                                                <div className="relative">
                                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                                    <input
                                                        type="text" name="sobrenome" required
                                                        value={formData.sobrenome} onChange={handleChange}
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-[#05080F] outline-none focus:border-emerald-500 transition-all"
                                                        placeholder="Silva"
                                                    />
                                                </div>
                                            </div>
                                            <div className="md:col-span-2 space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1 flex justify-between">
                                                    CRIE SEU LOGIN (USUÁRIO)
                                                </label>
                                                <div className="relative">
                                                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                                    <input
                                                        type="text" name="login" required
                                                        value={formData.login} onChange={handleChange}
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 pl-12 outline-none focus:border-emerald-500 focus:bg-white transition-all lowercase"
                                                        placeholder="joaosilva2024"
                                                    />
                                                </div>
                                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest pl-1">Link de indicação: {window.location.origin}/ref/{formData.login || 'seu-login'}</p>
                                            </div>
                                            <div className="md:col-span-2 space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">E-mail</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                                    <input
                                                        type="email" name="email" required
                                                        value={formData.email} onChange={handleChange}
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-[#05080F] outline-none focus:border-emerald-500 transition-all"
                                                        placeholder="exemplo@email.com"
                                                    />
                                                </div>
                                            </div>

                                            <div className="md:col-span-2 space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">WhatsApp / Celular</label>
                                                <div className="relative">
                                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                                    <input
                                                        type="text" name="whatsapp" required
                                                        value={formData.whatsapp} onChange={handleChange}
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-[#05080F] outline-none focus:border-emerald-500 transition-all"
                                                        placeholder="(00) 00000-0000"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">CPF (Pessoa Física)</label>
                                                <div className="relative">
                                                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                                    <input
                                                        type="text" name="cpf"
                                                        value={formData.cpf} onChange={handleChange}
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-[#05080F] outline-none focus:border-emerald-500 transition-all"
                                                        placeholder="000.000.000-00"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">CNPJ (Pessoa Jurídica)</label>
                                                <div className="relative">
                                                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                                    <input
                                                        type="text" name="cnpj"
                                                        value={formData.cnpj} onChange={handleChange}
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-[#05080F] outline-none focus:border-emerald-500 transition-all"
                                                        placeholder="00.000.000/0000-00"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Senha</label>
                                                <div className="relative">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                                    <input
                                                        type={showPassword ? "text" : "password"} name="senha" required
                                                        value={formData.senha} onChange={handleChange}
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-[#05080F] outline-none focus:border-emerald-500 transition-all"
                                                        placeholder="********"
                                                    />
                                                    <button 
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500"
                                                    >
                                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Confirmar Senha</label>
                                                <div className="relative">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                                    <input
                                                        type={showPassword ? "text" : "password"} name="confirmarSenha" required
                                                        value={formData.confirmarSenha} onChange={handleChange}
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-[#05080F] outline-none focus:border-emerald-500 transition-all"
                                                        placeholder="********"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contract Acceptance */}
                                        <div className="bg-slate-50 rounded-[2rem] p-6 md:p-8 space-y-6">
                                            <div className="flex items-start gap-4">
                                                <div className="p-3 bg-white rounded-xl shadow-sm">
                                                    <FileText className="w-6 h-6 text-emerald-500" />
                                                </div>
                                                <div className="flex-grow">
                                                    <h4 className="font-black text-sm text-[#0B1221]">Contrato de Afiliação</h4>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Leia as regras de bonificação e termos de uso</p>
                                                    <button type="button" className="flex items-center gap-2 text-[#0B1221] text-[10px] font-black hover:text-emerald-500 transition-colors bg-white px-4 py-2 rounded-lg border border-slate-100 shadow-sm uppercase tracking-widest">
                                                        <Download className="w-3.5 h-3.5" /> BAIXAR PDF
                                                    </button>
                                                </div>
                                            </div>
                                            <div
                                                onClick={() => setFormData(p => ({ ...p, aceiteContrato: !p.aceiteContrato }))}
                                                className="flex items-start gap-4 cursor-pointer group select-none"
                                            >
                                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.aceiteContrato ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-200 group-hover:border-slate-300'}`}>
                                                    {formData.aceiteContrato && <CheckCircle2 size={16} className="text-white" />}
                                                </div>
                                                <span className="text-[10px] font-black text-[#0B1221] uppercase tracking-widest leading-normal">
                                                    Li e aceito todas as regras do negócio
                                                </span>
                                            </div>
                                        </div>

                                        {error && (
                                            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-xs font-black uppercase tracking-widest text-center">
                                                {error}
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className={`w-full py-5 bg-[#0B1221] text-white rounded-2xl font-black text-sm shadow-2xl shadow-[#0B1221]/20 hover:bg-[#1a2436] transition-all flex items-center justify-center gap-3 uppercase tracking-widest ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {loading ? 'PROCESSANDO...' : 'CRIAR MINHA CONTA AGORA'}
                                            <Send className="w-5 h-5 text-emerald-500" />
                                        </button>
                                    </div>
                                </div>
                                <input type="hidden" name="organization_id" value={ORGANIZATION_ID} />
                            </form>
                        </div>
                        <p className="mt-8 text-center text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                            CELD Distribuidora © 2026 - Todos os direitos reservados
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default RegisterPage;

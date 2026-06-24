
import React, { useState, useEffect, useRef } from 'react';
import {
    User,
    Mail,
    Phone,
    Lock,
    Save,
    Camera,
    Loader2,
    ArrowLeft,
    CheckCircle,
    AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AffiliateLayout from '../components/AffiliateLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import toast from 'react-hot-toast';

const AffiliateSettings: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    
    const [profileData, setProfileData] = useState({
        full_name: '',
        email: '',
        whatsapp: '',
        cpf: '',
        cep: '',
        address: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        avatar_url: ''
    });

    // Password Change
    const [passwords, setPasswords] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        if (user) {
            fetchProfile();
        }
    }, [user]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            
            // Fetch from affiliates table (synced with user_profiles)
            const { data: affData, error } = await supabase
                .from('affiliates')
                .select('full_name, email, whatsapp, cpf, cep, address, street, number, complement, neighborhood, city, state, avatar_url')
                .eq('user_id', user?.id)
                .limit(1);

            if (error) throw error;

            const data = affData?.[0] || null;

            if (data) {
                setProfileData({
                    full_name: data.full_name || user?.user_metadata?.nome || '',
                    email: data.email || user?.email || '',
                    whatsapp: data.whatsapp || user?.user_metadata?.whatsapp || '',
                    cpf: data.cpf || user?.user_metadata?.cpf || '',
                    cep: data.cep || '',
                    address: data.address || '',
                    street: data.street || '',
                    number: data.number || '',
                    complement: data.complement || '',
                    neighborhood: data.neighborhood || '',
                    city: data.city || '',
                    state: data.state || '',
                    avatar_url: data.avatar_url || ''
                });
            } else {
                // Caso não exista registro em affiliates ainda, pré-preenche com dados do auth
                setProfileData(prev => ({
                    ...prev,
                    email: user?.email || '',
                    full_name: user?.user_metadata?.nome ? `${user.user_metadata.nome} ${user.user_metadata.sobrenome || ''}` : '',
                    whatsapp: user?.user_metadata?.whatsapp || '',
                    cpf: user?.user_metadata?.cpf || ''
                }));
            }
        } catch (error: any) {
            console.error('Error fetching profile:', error);
            toast.error('Erro ao carregar seu perfil.');
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            setSaving(true);

            // Update auth email if changed
            if (profileData.email !== user.email) {
                const { error: authErr } = await supabase.auth.updateUser({
                    email: profileData.email
                });
                if (authErr) throw authErr;
                toast.success('Confirme a mudança no seu novo e-mail!', { icon: '📧' });
            }

            // Update user_profiles
            const { error: profileErr } = await supabase
                .from('user_profiles')
                .update({
                    full_name: profileData.full_name,
                    email: profileData.email,
                    whatsapp: profileData.whatsapp,
                    cpf: profileData.cpf,
                    cep: profileData.cep,
                    street: profileData.street,
                    number: profileData.number,
                    complement: profileData.complement,
                    neighborhood: profileData.neighborhood,
                    city: profileData.city,
                    state: profileData.state,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (profileErr) throw profileErr;

            // Update affiliates
            const { error: affErr } = await supabase
                .from('affiliates')
                .update({
                    full_name: profileData.full_name,
                    email: profileData.email,
                    whatsapp: profileData.whatsapp,
                    cpf: profileData.cpf,
                    cep: profileData.cep,
                    street: profileData.street,
                    number: profileData.number,
                    complement: profileData.complement,
                    neighborhood: profileData.neighborhood,
                    city: profileData.city,
                    state: profileData.state,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id);

            if (affErr) throw affErr;

            toast.success('Perfil atualizado com sucesso!');
        } catch (error: any) {
            console.error('Error updating profile:', error);
            toast.error(error.message || 'Erro ao salvar alterações.');
        } finally {
            setSaving(false);
        }
    };

    const handleCepLookup = async (cep: string) => {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length !== 8) return;

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await response.json();
            
            if (!data.erro) {
                setProfileData(prev => ({
                    ...prev,
                    street: data.logradouro,
                    neighborhood: data.bairro,
                    city: data.localidade,
                    state: data.uf,
                    cep: cleanCep
                }));
            }
        } catch (error) {
            console.error('Error fetching CEP:', error);
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (passwords.newPassword !== passwords.confirmPassword) {
            toast.error('As senhas não coincidem!');
            return;
        }

        if (passwords.newPassword.length < 6) {
            toast.error('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        try {
            setSaving(true);
            const { error } = await supabase.auth.updateUser({
                password: passwords.newPassword
            });

            if (error) throw error;

            toast.success('Senha atualizada com sucesso!');
            setPasswords({ newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            console.error('Error updating password:', error);
            toast.error(error.message || 'Erro ao atualizar senha.');
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);

            if (!event.target.files || event.target.files.length === 0) {
                return;
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const filePath = `${user?.id}/${Math.random()}.${fileExt}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Update Database
            const { error: updateError } = await supabase
                .from('affiliates')
                .update({ avatar_url: publicUrl })
                .eq('user_id', user?.id);

            if (updateError) throw updateError;

            // Update local state
            setProfileData(prev => ({ ...prev, avatar_url: publicUrl }));
            toast.success('Foto de perfil atualizada!');
        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            toast.error('Erro ao enviar imagem.');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <AffiliateLayout>
                <div className="min-h-[60vh] flex items-center justify-center">
                    <Loader2 className="w-12 h-12 text-[#FBC02D] animate-spin" />
                </div>
            </AffiliateLayout>
        );
    }

    return (
        <AffiliateLayout>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button 
                        onClick={() => navigate('/dashboard')}
                        className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-[#0B1221] hover:shadow-md transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-[#0B1221]">Minhas Configurações</h1>
                        <p className="text-slate-500 font-medium">Gerencie suas informações pessoais e segurança.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Profile Picture Card */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 text-center sticky top-8">
                            <div className="relative inline-block mb-6 group">
                                <div className="w-40 h-40 rounded-full bg-slate-100 border-4 border-white shadow-xl mx-auto overflow-hidden flex items-center justify-center bg-cover bg-center"
                                     style={{ backgroundImage: profileData.avatar_url ? `url(${profileData.avatar_url})` : 'none' }}>
                                    {!profileData.avatar_url && (
                                        <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${profileData.full_name}`} alt="Avatar" className="w-full h-full object-cover" />
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-[#0B1221]/60 flex items-center justify-center">
                                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="absolute bottom-1 right-1 bg-emerald-500 w-12 h-12 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all group-hover:rotate-6"
                                >
                                    <Camera className="w-6 h-6" />
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    onChange={handleAvatarUpload}
                                    className="hidden" 
                                    accept="image/*"
                                />
                            </div>
                            <h3 className="text-xl font-black text-[#0B1221]">{profileData.full_name || 'Afiliado'}</h3>
                            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-1">Afiliado CELD</p>
                            
                            <div className="mt-8 space-y-3">
                                <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3 text-left">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-500 shadow-sm">
                                        <CheckCircle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                                        <p className="text-sm font-black text-[#0B1221]">Verificado</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Forms Area */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Personal Information */}
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 md:p-10">
                            <h3 className="text-xl font-black text-[#0B1221] mb-8 flex items-center gap-2">
                                <User className="w-5 h-5 text-[#FBC02D]" />
                                Informações Pessoais
                            </h3>

                            <form onSubmit={handleProfileUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#FBC02D] transition-colors">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="text"
                                            value={profileData.full_name}
                                            onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                                            className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#FBC02D] focus:border-transparent outline-none transition-all font-bold text-[#0B1221]"
                                            placeholder="Seu nome completo"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="email"
                                            value={profileData.email}
                                            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                            className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#FBC02D] focus:border-transparent outline-none transition-all font-bold text-[#0B1221]"
                                            placeholder="seu@email.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#FBC02D] transition-colors">
                                            <Phone className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="text"
                                            value={profileData.whatsapp}
                                            onChange={(e) => setProfileData({ ...profileData, whatsapp: e.target.value })}
                                            className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#FBC02D] focus:border-transparent outline-none transition-all font-bold text-[#0B1221]"
                                            placeholder="(00) 00000-0000"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">CPF</label>
                                    <input
                                        type="text"
                                        value={profileData.cpf}
                                        onChange={(e) => setProfileData({ ...profileData, cpf: e.target.value })}
                                        className="block w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#FBC02D] focus:border-transparent outline-none transition-all font-bold text-[#0B1221]"
                                        placeholder="000.000.000-00"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">CEP</label>
                                    <input
                                        type="text"
                                        value={profileData.cep}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setProfileData({ ...profileData, cep: val });
                                            if (val.replace(/\D/g, '').length === 8) {
                                                handleCepLookup(val);
                                            }
                                        }}
                                        className="block w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#FBC02D] focus:border-transparent outline-none transition-all font-bold text-[#0B1221]"
                                        placeholder="00000-000"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Rua / Logradouro</label>
                                    <input
                                        type="text"
                                        value={profileData.street}
                                        onChange={(e) => setProfileData({ ...profileData, street: e.target.value })}
                                        className="block w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#FBC02D] focus:border-transparent outline-none transition-all font-bold text-[#0B1221]"
                                        placeholder="Nome da rua"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Número</label>
                                        <input
                                            type="text"
                                            value={profileData.number}
                                            onChange={(e) => setProfileData({ ...profileData, number: e.target.value })}
                                            className="block w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#FBC02D] focus:border-transparent outline-none transition-all font-bold text-[#0B1221]"
                                            placeholder="123"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Complemento</label>
                                        <input
                                            type="text"
                                            value={profileData.complement}
                                            onChange={(e) => setProfileData({ ...profileData, complement: e.target.value })}
                                            className="block w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#FBC02D] focus:border-transparent outline-none transition-all font-bold text-[#0B1221]"
                                            placeholder="Apto, Bloco, etc."
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Bairro</label>
                                    <input
                                        type="text"
                                        value={profileData.neighborhood}
                                        onChange={(e) => setProfileData({ ...profileData, neighborhood: e.target.value })}
                                        className="block w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#FBC02D] focus:border-transparent outline-none transition-all font-bold text-[#0B1221]"
                                        placeholder="Seu bairro"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Cidade</label>
                                        <input
                                            type="text"
                                            value={profileData.city}
                                            onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                                            className="block w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#FBC02D] focus:border-transparent outline-none transition-all font-bold text-[#0B1221]"
                                            placeholder="Cidade"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">UF</label>
                                        <input
                                            type="text"
                                            maxLength={2}
                                            value={profileData.state}
                                            onChange={(e) => setProfileData({ ...profileData, state: e.target.value.toUpperCase() })}
                                            className="block w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#FBC02D] focus:border-transparent outline-none transition-all font-bold text-[#0B1221] uppercase"
                                            placeholder="SP"
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2 pt-4">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="w-full md:w-auto px-10 py-4 bg-[#0B1221] text-white rounded-2xl font-black text-sm hover:bg-[#1a2436] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#0B1221]/10 disabled:opacity-70"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        SALVAR ALTERAÇÕES
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Security Section */}
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 md:p-10">
                            <h3 className="text-xl font-black text-[#0B1221] mb-8 flex items-center gap-2">
                                <Lock className="w-5 h-5 text-emerald-500" />
                                Segurança & Senha
                            </h3>

                            <form onSubmit={handlePasswordUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha</label>
                                    <div className="relative group">
                                        <input
                                            type="password"
                                            value={passwords.newPassword}
                                            onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                            className="block w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-bold text-[#0B1221]"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                                    <div className="relative group">
                                        <input
                                            type="password"
                                            value={passwords.confirmPassword}
                                            onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                            className="block w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-bold text-[#0B1221]"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2 bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-start gap-3">
                                    <div className="p-2 bg-white rounded-xl text-emerald-500 shadow-sm mt-0.5">
                                        <AlertCircle className="w-4 h-4" />
                                    </div>
                                    <p className="text-xs font-medium text-emerald-800 leading-relaxed">
                                        <b>Dica de segurança:</b> Use uma senha com pelo menos 8 caracteres, incluindo letras, números e símbolos especiais para maior proteção da sua conta.
                                    </p>
                                </div>

                                <div className="md:col-span-2 pt-4">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="w-full md:w-auto px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 disabled:opacity-70"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                        ATUALIZAR SENHA
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </AffiliateLayout>
    );
};

export default AffiliateSettings;

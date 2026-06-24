import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Wallet,
    TrendingUp,
    LogOut,
    Library,
    Menu,
    X,
    Settings,
    ShoppingBag
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import { SITE_NAME } from '../lib/config';

interface AffiliateLayoutProps {
    children: React.ReactNode;
}

const AffiliateLayout: React.FC<AffiliateLayoutProps> = ({ children }) => {
    const location = useLocation();
    const { user } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            toast.success('Sessão encerrada com sucesso!');
        } catch (error: any) {
            toast.error('Erro ao sair do sistema.');
        }
    };

    const menuItems = [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { label: 'Indicações', icon: Users, path: '/dashboard/referrals' },
        { label: 'Meus Pedidos', icon: ShoppingBag, path: '/dashboard/orders' },
        { label: 'Financeiro', icon: Wallet, path: '/dashboard/financial' },
        { label: 'Relatórios', icon: TrendingUp, path: '/dashboard/reports' },
        // Consórcio oculto conforme requisitos do Grupo A
        // { label: 'Consórcio', icon: Star, path: '/dashboard/consorcio' },
        { label: 'Materiais', icon: Library, path: '/dashboard/materials' },
        { label: 'Configurações', icon: Settings, path: '/dashboard/settings' },
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row overflow-x-hidden">
            {/* Mobile Header */}
            <header className="lg:hidden h-16 bg-[#0B1221] px-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
                <Link to="/" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-2">
                    <img src="/assets/logo.png" className="h-8 w-auto object-contain" alt="CELD Distribuidora" />
                    <span className="text-white text-md font-black uppercase tracking-tight">
                        {SITE_NAME}
                    </span>
                </Link>
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 text-white hover:text-emerald-400 transition-colors"
                >
                    {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </header>

            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-[#0B1221]/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                w-72 bg-[#0B1221] flex flex-col p-6 text-white shrink-0 fixed h-full z-50 transition-transform duration-300 lg:translate-x-0 lg:static lg:h-auto
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="mb-12 px-2 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <img src="/assets/logo.png" className="h-10 w-auto object-contain" alt="CELD Distribuidora" />
                        <span className="text-xl font-black text-white tracking-tight uppercase">
                            {SITE_NAME}
                        </span>
                    </Link>
                </div>

                <nav className="flex-grow space-y-2">
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.label}
                                to={item.path}
                                onClick={() => setIsSidebarOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all group ${isActive
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'group-hover:text-emerald-400'}`} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-auto space-y-4">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Usuário</p>
                        <p className="text-sm font-medium truncate mb-4">{user?.email}</p>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl text-xs font-black transition-all"
                        >
                            <LogOut className="w-4 h-4" />
                            SAIR DO SISTEMA
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-grow p-4 md:p-8 lg:p-12 overflow-y-auto">
                {children}
            </main>
        </div>
    );
};

export default AffiliateLayout;

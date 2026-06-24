import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Package,
    ShoppingCart,
    ShieldAlert,
    LogOut,
    Bell,
    Search,
    ChevronRight,
    Percent,
    Wallet,
    Layers,
    Library,
    Menu,
    X,
    TrendingUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { SITE_NAME } from '../lib/config';

interface AdminLayoutProps {
    children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            toast.success('Sessão encerrada com sucesso!');
            navigate('/admin/login');
        } catch (error) {
            console.error('Error logging out:', error);
            toast.error('Erro ao sair do painel.');
        }
    };

    const menuItems = [
        { label: 'Visão Geral', icon: LayoutDashboard, path: '/admin/dashboard' },
        { label: 'Afiliados', icon: Users, path: '/admin/affiliates' },
        { label: 'Categorias', icon: Layers, path: '/admin/categories' },
        { label: 'Produtos', icon: Package, path: '/admin/products' },
        { label: 'Pedidos', icon: ShoppingCart, path: '/admin/orders' },
        // Consórcio ocultado conforme requisitos do Grupo A
        // { label: 'Consórcio', icon: Trophy, path: '/admin/consorcio' },
        { label: 'Comissões', icon: Percent, path: '/admin/commissions' },
        { label: 'Materiais', icon: Library, path: '/admin/materials' },
        { label: 'Financeiro', icon: Wallet, path: '/admin/financial' },
        { label: 'Relatórios', icon: TrendingUp, path: '/admin/reports' },
        { label: 'Segurança', icon: ShieldAlert, path: '/admin/security' },
    ];

    return (
        <div className="min-h-screen bg-[#F0F2F5]">
            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-[#05080F]/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                w-72 bg-[#05080F] flex flex-col p-6 text-white fixed inset-y-0 left-0 z-50 transition-transform duration-300 overflow-y-auto scrollbar-hide
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="mb-12 px-2 flex items-center gap-3">
                    <img src="/assets/logo.png" className="h-10 w-auto object-contain bg-white/5 p-1 rounded-lg" alt="CELD Logo" />
                    <span className="text-xl font-black text-white tracking-tight uppercase">{SITE_NAME}</span>
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
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.label}
                                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-auto pt-6 border-t border-white/10">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-red-400 hover:bg-red-400/10 transition-all w-full"
                    >
                        <LogOut className="w-5 h-5" />
                        Sair do Painel
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="lg:pl-72 min-h-screen flex flex-col transition-all duration-300">
                {/* Topbar */}
                <header className="h-20 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="lg:hidden p-2 text-slate-500 hover:text-[#05080F] transition-colors"
                        >
                            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                        <div className="relative w-48 md:w-96 hidden sm:block">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por pedidos, afiliados..."
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-12 pr-4 text-sm outline-none focus:border-emerald-500 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <button className="relative p-2 text-slate-400 hover:text-[#05080F] transition-colors">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="h-8 w-px bg-slate-200"></div>
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-black text-[#05080F]">Administrador</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Master Access</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="Admin" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;

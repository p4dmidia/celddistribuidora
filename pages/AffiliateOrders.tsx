import React, { useState, useEffect } from 'react';
import {
    ShoppingBag,
    Loader2,
    CheckCircle2,
    Truck,
    Clock,
    XCircle,
    Calendar,
    DollarSign,
    CreditCard
} from 'lucide-react';
import { ORGANIZATION_ID } from '../lib/config';
import AffiliateLayout from '../components/AffiliateLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import toast from 'react-hot-toast';

interface Order {
    id: string;
    total_amount: number;
    status: 'Pendente' | 'Pago' | 'Enviado' | 'Entregue' | 'Cancelado' | 'pending' | 'shipped' | 'completed' | 'cancelled';
    payment_status: 'pending' | 'paid' | 'failed';
    created_at: string;
    items_count: number;
    payment_method: string;
}

const AffiliateOrders: React.FC = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchOrders();
        }
    }, [user]);

    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', user?.id)
                .eq('organization_id', ORGANIZATION_ID)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (error) {
            console.error('Error fetching affiliate orders:', error);
            toast.error('Erro ao carregar seus pedidos.');
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    if (isLoading) {
        return (
            <AffiliateLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                    <p className="font-bold text-slate-400 text-xs uppercase tracking-widest">Carregando seus pedidos...</p>
                </div>
            </AffiliateLayout>
        );
    }

    return (
        <AffiliateLayout>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-black text-[#0B1221]">Meus Pedidos</h1>
                    <p className="text-slate-500 font-medium font-inter mt-1">Consulte o histórico de suas compras e ativações da cesta básica.</p>
                </div>

                {/* Orders List */}
                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-10 border-b border-slate-50">
                        <h3 className="text-xl font-black text-[#0B1221]">Histórico de Compras</h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px]">
                            <thead>
                                <tr className="bg-slate-50/50 text-left border-b border-slate-100">
                                    <th className="py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Identificador</th>
                                    <th className="py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Data da Compra</th>
                                    <th className="py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Forma de Pagamento</th>
                                    <th className="py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Valor</th>
                                    <th className="py-6 px-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-right">Status do Pedido</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {orders.length > 0 ? (
                                    orders.map((order) => (
                                        <tr key={order.id} className="group hover:bg-slate-50/30 transition-all">
                                            <td className="py-6 px-10">
                                                <div className="font-black text-[#0B1221] text-sm uppercase">Cesta Básica CELD</div>
                                                <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider font-mono">#{order.id.replace(/^#/, '').slice(0, 8)}</div>
                                            </td>
                                            <td className="py-6 px-4">
                                                <div className="text-slate-500 font-bold text-xs flex items-center gap-1.5 font-inter">
                                                    <Calendar className="w-4 h-4 text-slate-400" />
                                                    {new Date(order.created_at).toLocaleDateString('pt-BR')}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-medium ml-5 mt-0.5">{new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                                            </td>
                                            <td className="py-6 px-4">
                                                <div className="flex items-center gap-2">
                                                    <CreditCard className="w-4 h-4 text-emerald-500" />
                                                    <span className="text-slate-600 text-xs font-bold font-inter capitalize">{order.payment_method || 'Pix/Cartão'}</span>
                                                </div>
                                            </td>
                                            <td className="py-6 px-4">
                                                <div className="font-black text-[#0B1221] text-sm">{formatCurrency(order.total_amount || 300)}</div>
                                            </td>
                                            <td className="py-6 px-10 text-right">
                                                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                    order.status === 'completed' || order.status === 'Pago' || order.status === 'Entregue' ? 'bg-emerald-50 text-emerald-600' :
                                                    order.status === 'Enviado' || order.status === 'shipped' ? 'bg-purple-50 text-purple-600' :
                                                    order.status === 'Cancelado' || order.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                                                }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                                        order.status === 'completed' || order.status === 'Pago' || order.status === 'Entregue' ? 'bg-emerald-500' :
                                                        order.status === 'Enviado' || order.status === 'shipped' ? 'bg-purple-500' :
                                                        order.status === 'Cancelado' || order.status === 'cancelled' ? 'bg-red-500' : 'bg-amber-500'
                                                    }`}></div>
                                                    {order.status === 'pending' || order.status === 'Pendente' ? 'Pendente' :
                                                     order.status === 'shipped' || order.status === 'Enviado' ? 'Enviado' :
                                                     order.status === 'completed' || order.status === 'Pago' || order.status === 'Entregue' ? 'Concluído' : 'Cancelado'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-sm">
                                                <ShoppingBag className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <p className="font-bold text-slate-400 font-inter text-sm">Você ainda não realizou nenhuma compra.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AffiliateLayout>
    );
};

export default AffiliateOrders;

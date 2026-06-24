import React, { useState, useEffect } from 'react';
import { ShoppingCart, Check, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCart } from '../components/CartContext';
import { useAuth } from '../components/AuthContext';
import { ORGANIZATION_ID } from '../lib/config';
import toast from 'react-hot-toast';

const ShopPage: React.FC = () => {
    const navigate = useNavigate();
    const { addToCart, cart, clearCart } = useCart();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [product, setProduct] = useState<any>(null);

    useEffect(() => {
        const fetchCeldProduct = async () => {
            setIsLoading(true);
            try {
                // Tenta carregar o produto de cesta básica cadastrado no banco para a CELD
                const { data, error } = await supabase
                    .from('products')
                    .select('*')
                    .eq('organization_id', ORGANIZATION_ID)
                    .limit(1);

                if (!error && data && data.length > 0) {
                    const dbProd = data[0];
                    setProduct({
                        id: dbProd.id,
                        name: dbProd.name || 'Plano Único - Cesta Básica',
                        price: dbProd.price || 300.00,
                        image: (!dbProd.image_url || dbProd.image_url.includes('cesta-basica.png')) ? '/assets/cesta_basica.png' : dbProd.image_url,
                        category: 'Cesta Básica',
                        stock_quantity: dbProd.stock_quantity || 9999,
                        description: dbProd.description || 'Ativação e mensalidade recorrente da cesta básica CELD.'
                    });
                } else {
                    // Fallback local se o banco ainda não foi migrado
                    setProduct({
                        id: 'celd-cesta-basica-plano-unico',
                        name: 'Plano Único - Cesta Básica',
                        price: 300.00,
                        image: '/assets/cesta_basica.png',
                        category: 'Cesta Básica',
                        stock_quantity: 9999,
                        description: 'Inclui ativação de afiliado na rede MMN, recebimento da cesta básica de alimentos mensal e participação nas distribuições.'
                    });
                }
            } catch (err) {
                console.error('Erro ao buscar produto da CELD:', err);
                // Fallback de contingência
                setProduct({
                    id: 'celd-cesta-basica-plano-unico',
                    name: 'Plano Único - Cesta Básica',
                    price: 300.00,
                    image: '/assets/cesta_basica.png',
                    category: 'Cesta Básica',
                    stock_quantity: 9999,
                    description: 'Inclui ativação de afiliado na rede MMN, recebimento da cesta básica de alimentos mensal e participação nas distribuições.'
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchCeldProduct();
    }, []);

    const isAlreadyInCart = cart.some(item => item.id === product?.id);

    const handleBuyNow = () => {
        if (!product) return;

        // Limpa o carrinho antes para garantir que o usuário compre apenas o Plano Único
        clearCart();
        
        // Adiciona à cesta e redireciona
        addToCart({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            category: product.category,
            stock_quantity: product.stock_quantity,
            quantity: 1
        });

        toast.success('Plano adicionado ao carrinho!');
        navigate('/checkout');
    };

    if (isLoading) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando plano...</p>
            </div>
        );
    }

    return (
        <div className="min-h-[80vh] bg-slate-50 py-16 flex items-center justify-center">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden grid md:grid-cols-2 gap-8 p-8 md:p-12 items-center">
                    
                    {/* Left Column: Product Image */}
                    <div className="flex justify-center relative group">
                        <div className="absolute -inset-4 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors"></div>
                        <img 
                            src={product?.image || '/assets/cesta_basica.png'} 
                            alt={product?.name}
                            className="relative w-full max-w-sm h-auto object-contain rounded-3xl drop-shadow-[0_20px_40px_rgba(16,185,129,0.1)] transition-transform group-hover:scale-105 duration-500" 
                        />
                    </div>

                    {/* Right Column: Product details */}
                    <div className="space-y-6">
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black tracking-widest uppercase px-3.5 py-1.5 rounded-full inline-block">
                            Plano Exclusivo
                        </span>
                        
                        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 leading-tight">
                            {product?.name}
                        </h1>

                        <div className="flex items-baseline gap-2">
                            <span className="text-slate-400 text-sm font-bold">Por apenas</span>
                            <span className="text-4xl font-black text-slate-800">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product?.price || 300.00)}
                            </span>
                            <span className="text-slate-400 text-xs font-semibold">/ mensal</span>
                        </div>

                        <p className="text-slate-500 text-sm leading-relaxed font-inter">
                            {product?.description}
                        </p>

                        <div className="space-y-3 border-t border-slate-100 pt-6">
                            <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                                <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                                <span>Ativação imediata de conta na rede</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                                <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                                <span>Recebimento da cesta básica no endereço</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                                <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                                <span>Participação integral no MMN CELD</span>
                            </div>
                        </div>

                        <div className="pt-6">
                            <button
                                onClick={handleBuyNow}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-5 rounded-2xl shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                            >
                                {isAlreadyInCart ? 'Ir para o Checkout' : 'Adquirir Plano e Cesta'}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ShopPage;

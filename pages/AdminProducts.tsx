import React, { useState, useEffect } from 'react';
import {
    Package,
    Search,
    Filter,
    Plus,
    Edit,
    Trash2,
    CheckCircle,
    XCircle,
    Layers,
    Tag,
    BarChart,
    X,
    Upload,
    Box,
    Loader2,
    Info,
    ChevronDown
} from 'lucide-react';
import { ORGANIZATION_ID } from '../lib/config';
import AdminLayout from '../components/AdminLayout';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface Product {
    id: string;
    name: string;
    description: string;
    category_id: number;
    price: number;
    stock_quantity: number;
    image_url: string;
    is_active: boolean;
    sales_count: number;
    created_at: string;
    weight: number;
    length: number;
    width: number;
    height: number;
    origin_zip: string;
    variations?: any;
    product_categories?: {
        name: string;
        parent_id: number | null;
    };
}

interface Category {
    id: number;
    name: string;
    parent_id: number | null;
    children?: Category[];
    _count?: {
        products: number;
    };
}

const AdminProducts: React.FC = () => {
    const navigate = useNavigate();

    // States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('Todas');
    const [filterStatus, setFilterStatus] = useState('Todos');
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Form States
    const [formData, setFormData] = useState({
        name: '',
        parent_category_id: '',
        category_id: '',
        price: '',
        stock_quantity: '',
        description: '',
        weight: '0.5',
        length: '16',
        width: '11',
        height: '2',
        origin_zip: '82820-160',
        sizes_raw: '',
        colors_raw: '',
        numbering_raw: '',
        soles_raw: '',
        tips_raw: ''
    });
    const [varErrors, setVarErrors] = useState({
        sizes_raw: '',
        colors_raw: '',
        numbering_raw: '',
        soles_raw: '',
        tips_raw: ''
    });
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const itemsPerPage = 8;

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            await Promise.all([fetchProducts(), fetchCategories()]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchProducts = async () => {
        const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                product_categories (name, parent_id)
            `)
            .eq('organization_id', ORGANIZATION_ID)
            .order('created_at', { ascending: false });

        if (error) {
            toast.error('Erro ao carregar produtos');
            console.error(error);
        } else {
            setProducts(data || []);
        }
    };

    const fetchCategories = async () => {
        const { data, error } = await supabase
            .from('product_categories')
            .select('*')
            .eq('organization_id', ORGANIZATION_ID)
            .order('name');

        if (error) {
            toast.error('Erro ao carregar categorias');
        } else {
            const buildTree = (cats: any[]): Category[] => {
                const map = new Map<number | null, Category[]>();
                cats.forEach(cat => {
                    if (!map.has(cat.parent_id)) map.set(cat.parent_id, []);
                    map.get(cat.parent_id)!.push({ ...cat, children: [] });
                });

                const resolveChildren = (parentId: number | null): Category[] => {
                    const children = map.get(parentId) || [];
                    return children.map(child => ({
                        ...child,
                        children: resolveChildren(child.id)
                    }));
                };

                return resolveChildren(null);
            };
            setCategories(buildTree(data || []));
        }
    };

    const categoriesToSelect = (nodes: Category[], prefix = ''): { id: number, name: string }[] => {
        let list: { id: number, name: string }[] = [];
        nodes.forEach(node => {
            list.push({ id: node.id, name: prefix + node.name });
            if (node.children) {
                list = [...list, ...categoriesToSelect(node.children, prefix + node.name + ' > ')];
            }
        });
        return list;
    };

    const handleOpenEdit = (prod: Product) => {
        setEditingProduct(prod);
        setFormData({
            name: prod.name,
            parent_category_id: prod.product_categories?.parent_id?.toString() || prod.category_id?.toString() || '',
            category_id: prod.product_categories?.parent_id ? prod.category_id.toString() : '',
            price: prod.price.toString(),
            stock_quantity: prod.stock_quantity.toString(),
            description: prod.description || '',
            weight: (prod.weight || 0.5).toString(),
            length: (prod.length || 16).toString(),
            width: (prod.width || 11).toString(),
            height: (prod.height || 2).toString(),
            origin_zip: prod.origin_zip || '82820-160',
            sizes_raw: prod.variations?.sizes?.join(', ') || '',
            colors_raw: prod.variations?.colors?.join(', ') || '',
            numbering_raw: prod.variations?.numbering?.join(', ') || '',
            soles_raw: prod.variations?.soles?.join(', ') || '',
            tips_raw: prod.variations?.tips?.join(', ') || ''
        });
        const imgs = (prod.image_url || '').split(',').map(s => s.trim()).filter(Boolean);
        setExistingImages(imgs);
        setImagePreviews([]);
        setSelectedImages([]);
        setVarErrors({
            sizes_raw: '',
            colors_raw: '',
            numbering_raw: '',
            soles_raw: '',
            tips_raw: ''
        });
        setIsNewModalOpen(true);
    };

    const validateVariations = (field: string, value: string) => {
        if (!value) {
            setVarErrors(prev => ({ ...prev, [field]: '' }));
            return;
        }

        const invalidChars = /[;.:|\\]/;
        let error = '';
        
        if (invalidChars.test(value)) {
            error = 'Use apenas vírgulas para separar as variações';
        } else if (value.includes(' ') && !value.includes(',')) {
            const words = value.trim().split(/\s+/);
            if (words.length > 2) {
                error = 'Use vírgulas para separar (ex: P, M, G)';
            }
        }

        setVarErrors(prev => ({ ...prev, [field]: error }));
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            let finalImageUrls = [...existingImages];

            if (selectedImages.length > 0) {
                for (const file of selectedImages) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Math.random()}.${fileExt}`;
                    const { error: uploadError, data } = await supabase.storage
                        .from('product-images')
                        .upload(`products/${fileName}`, file);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from('product-images')
                        .getPublicUrl(data.path);

                    finalImageUrls.push(publicUrl);
                }
            }

            const imageUrl = finalImageUrls.join(',');

            const rawPrice = formData.price.toString().replace(/[R$\s.]/g, '').replace(',', '.');
            const parsedPrice = parseFloat(rawPrice);

            if (isNaN(parsedPrice)) {
                toast.error('Preço inválido');
                setIsSaving(false);
                return;
            }

            const productData = {
                name: formData.name,
                category_id: parseInt(formData.category_id || formData.parent_category_id),
                price: parsedPrice,
                stock_quantity: parseInt(formData.stock_quantity),
                description: formData.description,
                image_url: imageUrl,
                is_active: true,
                weight: parseFloat(formData.weight) || 0.5,
                length: parseFloat(formData.length) || 16,
                width: parseFloat(formData.width) || 11,
                height: parseFloat(formData.height) || 2,
                origin_zip: formData.origin_zip || '82820-160',
                variations: {
                    sizes: formData.sizes_raw.split(',').map(s => s.trim()).filter(s => s),
                    colors: formData.colors_raw.split(',').map(s => s.trim()).filter(s => s),
                    numbering: formData.numbering_raw.split(',').map(s => s.trim()).filter(s => s),
                    soles: formData.soles_raw.split(',').map(s => s.trim()).filter(s => s),
                    tips: formData.tips_raw.split(',').map(s => s.trim()).filter(s => s)
                },
                organization_id: ORGANIZATION_ID
            };

            if (editingProduct) {
                const { error } = await supabase
                    .from('products')
                    .update(productData)
                    .eq('id', editingProduct.id)
                    .eq('organization_id', ORGANIZATION_ID);
                if (error) throw error;
                toast.success('Produto atualizado com sucesso!');
            } else {
                const { error } = await supabase
                    .from('products')
                    .insert([productData]);
                if (error) throw error;
                toast.success('Produto cadastrado com sucesso!');
            }

            setIsNewModalOpen(false);
            resetForm();
            fetchProducts();
            fetchCategories();
        } catch (error: any) {
            toast.error(editingProduct ? 'Erro ao atualizar produto' : 'Erro ao cadastrar produto');
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteProduct = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir este produto?')) return;

        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id)
                .eq('organization_id', ORGANIZATION_ID);

            if (error) throw error;

            toast.success('Produto removido');
            fetchProducts();
            fetchCategories();
        } catch (error) {
            toast.error('Erro ao excluir produto');
        }
    };

    const toggleProductStatus = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('products')
                .update({ is_active: !currentStatus })
                .eq('id', id)
                .eq('organization_id', ORGANIZATION_ID);

            if (error) throw error;

            toast.success(`Produto ${!currentStatus ? 'ativado' : 'desativado'}`);
            fetchProducts();
        } catch (error) {
            toast.error('Erro ao atualizar status');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            parent_category_id: '',
            category_id: '',
            price: '',
            stock_quantity: '',
            description: '',
            weight: '0.5',
            length: '16',
            width: '11',
            height: '2',
            origin_zip: '82820-160',
            sizes_raw: '',
            colors_raw: '',
            numbering_raw: '',
            soles_raw: '',
            tips_raw: ''
        });
        setVarErrors({
            sizes_raw: '',
            colors_raw: '',
            numbering_raw: '',
            soles_raw: '',
            tips_raw: ''
        });
        setEditingProduct(null);
        setSelectedImages([]);
        setImagePreviews([]);
        setExistingImages([]);
    };

    const filteredProducts = products.filter(prod => {
        const matchesSearch = prod.name.toLowerCase().includes(searchTerm.toLowerCase());
        const categoryName = prod.product_categories?.name || 'Sem Categoria';
        const matchesCategory = filterCategory === 'Todas' || categoryName === filterCategory;

        let statusText = 'Ativo';
        if (!prod.is_active) statusText = 'Inativo';
        else if (prod.stock_quantity === 0) statusText = 'Sem Estoque';
        else if (prod.stock_quantity <= 10) statusText = 'Estoque Baixo';

        const matchesStatus = filterStatus === 'Todos' || statusText === filterStatus;

        return matchesSearch && matchesCategory && matchesStatus;
    });

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const currentData = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const getStatusInfo = (prod: Product) => {
        if (!prod.is_active) return { text: 'Inativo', color: 'bg-slate-50 text-slate-600' };
        if (prod.stock_quantity === 0) return { text: 'Sem Estoque', color: 'bg-red-50 text-red-600' };
        if (prod.stock_quantity <= 10) return { text: 'Estoque Baixo', color: 'bg-amber-50 text-amber-600' };
        return { text: 'Ativo', color: 'bg-emerald-50 text-emerald-600' };
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []) as File[];
        if (files.length === 0) return;

        const totalCount = existingImages.length + selectedImages.length + files.length;
        if (totalCount > 10) {
            toast.error('Você pode cadastrar no máximo 10 imagens por produto');
            return;
        }

        const validFiles: File[] = [];
        const newPreviews: string[] = [];

        for (const file of files) {
            if (file.size > 2 * 1024 * 1024) {
                toast.error(`A imagem ${file.name} excede o limite de 2MB`);
                continue;
            }
            validFiles.push(file);
            newPreviews.push(URL.createObjectURL(file));
        }

        setSelectedImages(prev => [...prev, ...validFiles]);
        setImagePreviews(prev => [...prev, ...newPreviews]);
        
        // Reset input to allow selecting same file again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeExistingImage = (index: number) => {
        setExistingImages(prev => prev.filter((_, i) => i !== index));
    };

    const removeNewImage = (index: number) => {
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => {
            const previewToRemove = prev[index];
            if (previewToRemove) URL.revokeObjectURL(previewToRemove);
            return prev.filter((_, i) => i !== index);
        });
    };

    return (
        <AdminLayout>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-[#05080F]">Gestão de Produtos</h1>
                        <p className="text-slate-500 font-medium text-sm md:text-base">Controle seu catálogo de produtos, estoque e preços.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                        <button
                            onClick={() => navigate('/admin/categories')}
                            className="bg-white border border-slate-200 px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-slate-600 hover:shadow-md transition-all whitespace-nowrap w-full sm:w-auto"
                        >
                            <Layers className="w-4 h-4 text-[#FBC02D]" />
                            Gerenciar Categorias
                        </button>
                        <button
                            onClick={() => {
                                resetForm();
                                setIsNewModalOpen(true);
                            }}
                            className="bg-[#05080F] text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-xl shadow-[#05080F]/10 hover:bg-[#1a2436] transition-all whitespace-nowrap w-full sm:w-auto"
                        >
                            <Plus className="w-4 h-4 text-[#FBC02D]" />
                            Novo Produto
                        </button>
                    </div>
                </div>

                <div className="bg-white p-4 md:p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between relative z-20">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nome..."
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:border-[#FBC02D] transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                            className={`flex-grow md:flex-none flex items-center justify-center gap-2 px-6 py-3 border rounded-2xl font-bold transition-all text-sm ${isFiltersOpen ? 'bg-[#FBC02D]/10 border-[#FBC02D] text-[#05080F]' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Filter className="w-4 h-4 text-[#FBC02D]" />
                            Filtros {(filterStatus !== 'Todos' || filterCategory !== 'Todas') && <span className="w-2 h-2 bg-[#FBC02D] rounded-full"></span>}
                        </button>
                    </div>

                    {isFiltersOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 p-6 rounded-[2rem] shadow-xl animate-in zoom-in-95 duration-200">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Status</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-bold text-[#05080F] outline-none focus:border-[#FBC02D]"
                                        value={filterStatus}
                                        onChange={(e) => {
                                            setFilterStatus(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                    >
                                        <option>Todos</option>
                                        <option>Ativo</option>
                                        <option>Estoque Baixo</option>
                                        <option>Sem Estoque</option>
                                        <option>Inativo</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Categoria</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-bold text-[#05080F] outline-none focus:border-[#FBC02D]"
                                        value={filterCategory}
                                        onChange={(e) => {
                                            setFilterCategory(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                    >
                                        <option>Todas</option>
                                        {categoriesToSelect(categories).map(cat => (
                                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Limpar</label>
                                    <button
                                        onClick={() => {
                                            setFilterStatus('Todos');
                                            setFilterCategory('Todas');
                                            setSearchTerm('');
                                            setIsFiltersOpen(false);
                                        }}
                                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl p-3 text-xs font-black uppercase tracking-widest transition-all"
                                    >
                                        Limpar Tudo
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="hidden lg:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        <th className="text-left py-6 px-8 text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Produto</th>
                                        <th className="text-left py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Categorização</th>
                                        <th className="text-left py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Preço</th>
                                        <th className="text-left py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Estoque</th>
                                        <th className="text-center py-6 px-4 text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Status</th>
                                        <th className="text-right py-6 px-8 text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {isLoading ? (
                                        [1, 2, 3, 4, 5].map(i => (
                                            <tr key={i} className="animate-pulse">
                                                <td className="py-6 px-8"><div className="h-14 w-full bg-slate-100 rounded-2xl"></div></td>
                                                <td className="py-6 px-4"><div className="h-6 w-24 bg-slate-100 rounded-full"></div></td>
                                                <td className="py-6 px-4"><div className="h-6 w-20 bg-slate-100 rounded-lg"></div></td>
                                                <td className="py-6 px-4"><div className="h-6 w-16 bg-slate-100 rounded-lg"></div></td>
                                                <td className="py-6 px-4"><div className="h-8 w-24 bg-slate-100 rounded-full mx-auto"></div></td>
                                                <td className="py-6 px-8"><div className="h-10 w-24 bg-slate-100 rounded-xl ml-auto"></div></td>
                                            </tr>
                                        ))
                                    ) : currentData.map((prod) => {
                                        const statusInfo = getStatusInfo(prod);
                                        return (
                                            <tr key={prod.id} className="group hover:bg-slate-50/50 transition-colors">
                                                <td className="py-6 px-8">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-[#05080F] overflow-hidden shrink-0">
                                                            {prod.image_url ? (
                                                                <img src={prod.image_url.split(',')[0].trim()} alt={prod.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Package className="w-6 h-6 text-[#FBC02D]" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-black text-[#05080F] truncate">{prod.name}</p>
                                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider mt-0.5">
                                                                <BarChart className="w-3 h-3 text-[#FBC02D]" /> {prod.sales_count} vendas
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-6 px-4">
                                                    <p className="text-sm font-bold text-slate-600">{prod.product_categories?.name || 'Sem Categoria'}</p>
                                                </td>
                                                <td className="py-6 px-4 font-black text-[#05080F]">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.price)}
                                                </td>
                                                <td className="py-6 px-4 font-bold text-[#05080F]">
                                                    {prod.stock_quantity} un.
                                                </td>
                                                <td className="py-6 px-4 text-center">
                                                    <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${statusInfo.color}`}>
                                                        {statusInfo.text}
                                                    </span>
                                                </td>
                                                <td className="py-6 px-8 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleOpenEdit(prod)}
                                                            className="p-2 text-slate-300 hover:text-[#FBC02D] hover:bg-[#FBC02D]/10 rounded-xl transition-all"
                                                            title="Editar"
                                                        >
                                                            <Edit className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => toggleProductStatus(prod.id, prod.is_active)}
                                                            className={`p-2 rounded-xl transition-all ${prod.is_active ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                                                            title={prod.is_active ? 'Desativar' : 'Ativar'}
                                                        >
                                                            {prod.is_active ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteProduct(prod.id)}
                                                            className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isLoading ? (
                            [1, 2, 3, 4].map(i => (
                                <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm animate-pulse space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-slate-100 rounded-2xl shrink-0"></div>
                                        <div className="flex-grow space-y-2">
                                            <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                                            <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                                        </div>
                                    </div>
                                    <div className="h-10 bg-slate-100 rounded-xl"></div>
                                </div>
                            ))
                        ) : currentData.length > 0 ? (
                            currentData.map((prod) => {
                                const statusInfo = getStatusInfo(prod);
                                return (
                                    <div key={prod.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-[#05080F] overflow-hidden shrink-0">
                                                {prod.image_url ? (
                                                    <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Package className="w-8 h-8 text-[#FBC02D]" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-black text-[#05080F] text-lg truncate">{prod.name}</h3>
                                                <p className="text-sm font-bold text-slate-500">{prod.product_categories?.name || 'Sem Categoria'}</p>
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full text-[9px] font-black uppercase tracking-wider ${statusInfo.color}`}>
                                                    {statusInfo.text}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço</p>
                                                <p className="font-black text-[#05080F]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.price)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estoque</p>
                                                <p className="font-bold text-[#05080F]">{prod.stock_quantity} unidades</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-2 pt-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleOpenEdit(prod)}
                                                    className="p-3 bg-slate-50 text-slate-400 hover:text-[#FBC02D] hover:bg-[#FBC02D]/10 rounded-xl transition-all"
                                                >
                                                    <Edit className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => toggleProductStatus(prod.id, prod.is_active)}
                                                    className={`p-3 rounded-xl transition-all ${prod.is_active ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'}`}
                                                >
                                                    {prod.is_active ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteProduct(prod.id)}
                                                    className="p-3 bg-red-50 text-red-400 hover:text-red-500 rounded-xl transition-all"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Vendas</p>
                                                <p className="font-black text-[#FBC02D]">{prod.sales_count}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-slate-100">
                                <Search className="w-12 h-12 opacity-20 mx-auto" />
                                <p className="font-bold text-slate-400 mt-3">Nenhum produto encontrado.</p>
                            </div>
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className="p-8 flex justify-center flex-wrap gap-2">
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-10 h-10 md:w-auto md:px-4 md:py-2 rounded-xl text-sm font-bold transition-all ${currentPage === i + 1 ? 'bg-[#05080F] text-white shadow-lg shadow-[#05080F]/10' : 'bg-white border border-slate-100 hover:bg-slate-50 text-[#05080F]'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {isNewModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 lg:p-8">
                    <div className="absolute inset-0 bg-[#05080F]/80 backdrop-blur-sm" onClick={() => setIsNewModalOpen(false)}></div>
                    <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-[3.5rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
                        <div className="p-6 md:p-10 border-b border-slate-50 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-black text-[#05080F]">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
                                <p className="text-slate-400 font-bold mt-1 uppercase text-[10px] md:text-xs tracking-widest">{editingProduct ? 'Atualizar catálogo' : 'Adicionar ao catálogo'}</p>
                            </div>
                            <button type="button" onClick={() => setIsNewModalOpen(false)} className="p-3 md:p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all">
                                <X className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        </div>

                        <div className="flex-grow overflow-y-auto p-6 md:p-10 custom-scrollbar">
                            <form className="space-y-8" onSubmit={handleSaveProduct}>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Nome do Produto</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-4 font-bold text-[#05080F] outline-none focus:border-[#FBC02D] text-sm"
                                                placeholder="Ex: Colchão Elite"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Categoria Principal</label>
                                            <select
                                                required
                                                value={formData.parent_category_id}
                                                onChange={(e) => setFormData({ ...formData, parent_category_id: e.target.value, category_id: '' })}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-4 font-bold text-[#05080F] outline-none focus:border-[#FBC02D] text-sm"
                                            >
                                                <option value="">Selecionar...</option>
                                                {categories.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Subcategoria (Opcional)</label>
                                            <select
                                                value={formData.category_id}
                                                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-4 font-bold text-[#05080F] outline-none focus:border-[#FBC02D] text-sm"
                                                disabled={!formData.parent_category_id}
                                            >
                                                <option value="">Mesma da Principal</option>
                                                {categories.find(c => c.id.toString() === formData.parent_category_id)?.children?.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Preço</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.price}
                                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-4 font-bold text-[#05080F] outline-none focus:border-[#FBC02D] text-sm"
                                                placeholder="R$ 0,00"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Estoque</label>
                                            <input
                                                type="number"
                                                required
                                                value={formData.stock_quantity}
                                                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-4 font-bold text-[#05080F] outline-none focus:border-[#FBC02D] text-sm"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    <div className="p-4 md:p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 space-y-6">
                                        <h3 className="text-[10px] md:text-sm font-black text-[#05080F] flex items-center gap-2 uppercase tracking-widest">
                                            <Box className="w-4 h-4 text-[#FBC02D]" />
                                            LOGÍSTICA (FRETE)
                                        </h3>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Peso (kg)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    required
                                                    value={formData.weight}
                                                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                                    className="w-full bg-white border border-slate-100 rounded-xl py-3 px-3 font-bold text-[#05080F] outline-none focus:border-[#FBC02D] text-xs"
                                                    placeholder="0.5"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Comp. (cm)</label>
                                                <input
                                                    type="number"
                                                    required
                                                    value={formData.length}
                                                    onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                                                    className="w-full bg-white border border-slate-100 rounded-xl py-3 px-3 font-bold text-[#05080F] outline-none focus:border-[#FBC02D] text-xs"
                                                    placeholder="16"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Larg. (cm)</label>
                                                <input
                                                    type="number"
                                                    required
                                                    value={formData.width}
                                                    onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                                                    className="w-full bg-white border border-slate-100 rounded-xl py-3 px-3 font-bold text-[#05080F] outline-none focus:border-[#FBC02D] text-xs"
                                                    placeholder="11"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Alt. (cm)</label>
                                                <input
                                                    type="number"
                                                    required
                                                    value={formData.height}
                                                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                                                    className="w-full bg-white border border-slate-100 rounded-xl py-3 px-3 font-bold text-[#05080F] outline-none focus:border-[#FBC02D] text-xs"
                                                    placeholder="2"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">CEP de Origem (Saída)</label>
                                            <select
                                                required
                                                value={formData.origin_zip}
                                                onChange={(e) => setFormData({ ...formData, origin_zip: e.target.value })}
                                                className="w-full bg-white border border-slate-100 rounded-2xl py-4 px-4 font-bold text-[#05080F] outline-none focus:border-[#FBC02D] text-sm"
                                            >
                                                <option value="82820-160">82820-160 (Curitiba - Feminino/Ternos)</option>
                                                <option value="93542-440">93542-440 (Novo Hamburgo - Sapato Masc.)</option>
                                                <option value="01104-001">01104-001 (São Paulo - Roupas Fem.)</option>
                                                <option value="04303-001">04303-001 (São Paulo - São Judas)</option>
                                                <option value="38445-072">38445-072 (Araguari - MG)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                        <div className="flex items-center justify-between px-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Variações / Opções do Produto</label>
                                            <Info className="w-4 h-4 text-slate-300" />
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase text-slate-500 tracking-tighter pl-1">Tamanhos (ex: P, M, G ou Casal, Queen)</label>
                                                <input
                                                    type="text"
                                                    value={formData.sizes_raw}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setFormData({ ...formData, sizes_raw: val });
                                                        validateVariations('sizes_raw', val);
                                                    }}
                                                    className={`w-full bg-white border ${varErrors.sizes_raw ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-100'} rounded-xl py-3 px-4 font-bold text-[#05080F] outline-none focus:border-[#FBC02D] text-xs transition-all`}
                                                    placeholder="Separados por vírgula..."
                                                />
                                                {varErrors.sizes_raw && <p className="text-[10px] text-red-500 font-bold pl-1 animate-in fade-in slide-in-from-top-1">{varErrors.sizes_raw}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase text-slate-500 tracking-tighter pl-1">Cores (ex: Preto, Branco, Azul)</label>
                                                <input
                                                    type="text"
                                                    value={formData.colors_raw}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setFormData({ ...formData, colors_raw: val });
                                                        validateVariations('colors_raw', val);
                                                    }}
                                                    className={`w-full bg-white border ${varErrors.colors_raw ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-100'} rounded-xl py-3 px-4 font-bold text-[#05080F] outline-none focus:border-[#FBC02D] text-xs transition-all`}
                                                    placeholder="Separados por vírgula..."
                                                />
                                                {varErrors.colors_raw && <p className="text-[10px] text-red-500 font-bold pl-1 animate-in fade-in slide-in-from-top-1">{varErrors.colors_raw}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase text-slate-500 tracking-tighter pl-1">Numeração (Calçados)</label>
                                                <input
                                                    type="text"
                                                    value={formData.numbering_raw}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setFormData({ ...formData, numbering_raw: val });
                                                        validateVariations('numbering_raw', val);
                                                    }}
                                                    className={`w-full bg-white border ${varErrors.numbering_raw ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-100'} rounded-xl py-3 px-4 font-bold text-[#05080F] outline-none focus:border-[#FBC02D] text-xs transition-all`}
                                                    placeholder="Ex: 38, 39, 40..."
                                                />
                                                {varErrors.numbering_raw && <p className="text-[10px] text-red-500 font-bold pl-1 animate-in fade-in slide-in-from-top-1">{varErrors.numbering_raw}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase text-slate-500 tracking-tighter pl-1">Tipos de Solado</label>
                                                <input
                                                    type="text"
                                                    value={formData.soles_raw}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setFormData({ ...formData, soles_raw: val });
                                                        validateVariations('soles_raw', val);
                                                    }}
                                                    className={`w-full bg-white border ${varErrors.soles_raw ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-100'} rounded-xl py-3 px-4 font-bold text-[#05080F] outline-none focus:border-[#FBC02D] text-xs transition-all`}
                                                    placeholder="Ex: Borracha, Emborrachado..."
                                                />
                                                {varErrors.soles_raw && <p className="text-[10px] text-red-500 font-bold pl-1 animate-in fade-in slide-in-from-top-1">{varErrors.soles_raw}</p>}
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase text-slate-500 tracking-tighter pl-1">Tipos de Bico</label>
                                                <input
                                                    type="text"
                                                    value={formData.tips_raw}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setFormData({ ...formData, tips_raw: val });
                                                        validateVariations('tips_raw', val);
                                                    }}
                                                    className={`w-full bg-white border ${varErrors.tips_raw ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-100'} rounded-xl py-3 px-4 font-bold text-[#05080F] outline-none focus:border-[#FBC02D] text-xs transition-all`}
                                                    placeholder="Ex: Fino, Quadrado..."
                                                />
                                                {varErrors.tips_raw && <p className="text-[10px] text-red-500 font-bold pl-1 animate-in fade-in slide-in-from-top-1">{varErrors.tips_raw}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Descrição</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-4 font-bold text-[#05080F] outline-none focus:border-[#FBC02D] min-h-[100px] text-sm"
                                            placeholder="Detalhes do produto..."
                                        />
                                    </div>

                                    <div className="space-y-4 bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 shadow-inner">
                                        <div className="flex items-center justify-between px-2">
                                            <div className="flex flex-col">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Galeria de Imagens</label>
                                                <p className="text-[9px] font-bold text-slate-400 opacity-70">Máximo de 10 fotos • Até 2MB cada</p>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${existingImages.length + selectedImages.length >= 10 ? 'bg-red-50 text-red-500' : 'bg-white text-slate-400 border border-slate-100'}`}>
                                                {existingImages.length + selectedImages.length}/10
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                            {/* Existing Images */}
                                            {existingImages.map((url, idx) => (
                                                <div key={`existing-${idx}`} className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100">
                                                    <img src={url} alt="Produto" className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeExistingImage(idx)}
                                                        className="absolute top-1.5 right-1.5 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-md transform hover:scale-110 active:scale-95"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                    <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-[#05080F]/40 backdrop-blur-[2px] rounded-md text-[7px] font-black text-white uppercase tracking-widest">Salva</div>
                                                </div>
                                            ))}

                                            {/* Local Previews */}
                                            {imagePreviews.map((blob, idx) => (
                                                <div key={`new-${idx}`} className="relative group aspect-square rounded-2xl overflow-hidden border-2 border-dashed border-[#FBC02D]/40 bg-[#FBC02D]/5 shadow-sm">
                                                    <img src={blob} alt="Preview" className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeNewImage(idx)}
                                                        className="absolute top-1.5 right-1.5 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-md transform hover:scale-110 active:scale-95"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                    <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-[#FBC02D] rounded-md text-[7px] font-black text-[#05080F] uppercase tracking-widest">Nova</div>
                                                </div>
                                            ))}

                                            {/* Add Button */}
                                            {existingImages.length + selectedImages.length < 10 && (
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="aspect-square border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-1.5 hover:border-[#FBC02D] hover:bg-white hover:shadow-xl hover:shadow-[#FBC02D]/5 transition-all group bg-slate-50/50"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-slate-100 group-hover:border-[#FBC02D]/30 transition-colors">
                                                        <Upload className="w-4 h-4 text-slate-400 group-hover:text-[#FBC02D] transition-colors" />
                                                    </div>
                                                    <span className="text-[8px] font-black text-slate-400 group-hover:text-[#05080F] uppercase tracking-widest">Adicionar</span>
                                                </button>
                                            )}
                                        </div>
                                        <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" multiple />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSaving || Object.values(varErrors).some(err => err !== '')}
                                        className="w-full py-5 bg-[#05080F] text-white rounded-2xl font-black text-sm shadow-xl hover:bg-[#1a2436] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : editingProduct ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR PRODUTO'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminProducts;

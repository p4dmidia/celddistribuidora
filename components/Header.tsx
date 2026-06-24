import React, { useState } from 'react';
import { User, ShoppingCart, Menu, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from './CartContext';
import { SITE_NAME } from '../lib/config';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNavClick = (anchorId: string) => {
    setIsMenuOpen(false);
    if (window.location.pathname !== '/') {
      navigate(`/${anchorId}`);
    } else {
      const element = document.getElementById(anchorId.replace('#', ''));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="w-full bg-white shadow-sm sticky top-0 z-50">
      {/* Top Bar */}
      <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3" onClick={() => setIsMenuOpen(false)}>
          <img src="/assets/logo.png" className="h-10 w-auto object-contain" alt="CELD Distribuidora" />
          <span className="text-xl font-black text-slate-800 tracking-tight uppercase">
            {SITE_NAME}
          </span>
        </Link>

        {/* Institutional Menu Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
          <Link to="/" onClick={() => handleNavClick('#home')} className="hover:text-emerald-500 transition-colors">Home</Link>
          <a href="#como-funciona" onClick={(e) => { e.preventDefault(); handleNavClick('#como-funciona'); }} className="hover:text-emerald-500 transition-colors">Como Funciona</a>
          <a href="#plano" onClick={(e) => { e.preventDefault(); handleNavClick('#plano'); }} className="hover:text-emerald-500 transition-colors">Plano de Negócios</a>
          <a href="#beneficios" onClick={(e) => { e.preventDefault(); handleNavClick('#beneficios'); }} className="hover:text-emerald-500 transition-colors">Benefícios</a>
          <a href="#faq" onClick={(e) => { e.preventDefault(); handleNavClick('#faq'); }} className="hover:text-emerald-500 transition-colors">FAQ</a>
          <a href="#contato" onClick={(e) => { e.preventDefault(); handleNavClick('#contato'); }} className="hover:text-emerald-500 transition-colors">Contato</a>
        </nav>

        <div className="flex items-center gap-2 md:gap-4">
          <Link to="/checkout" className="relative p-2 text-slate-600 hover:text-emerald-500 transition-colors">
            <ShoppingCart className="w-5 h-5 md:w-6 md:h-6" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[10px] font-black w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center border-2 border-white">
                {cartCount}
              </span>
            )}
          </Link>

          <Link to="/login" className="hidden sm:flex bg-emerald-500 hover:bg-emerald-600 text-white transition-colors rounded-lg py-2 px-3 md:px-5 items-center gap-2 text-xs md:text-sm font-bold shadow-md shadow-emerald-500/10">
            <User className="w-4 h-4" />
            Minha Conta
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-emerald-500 transition-colors"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`
        fixed inset-0 z-50 bg-[#0B1221] transition-transform duration-300 md:hidden
        ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <img src="/assets/logo.png" className="h-8 w-auto object-contain" alt="CELD Distribuidora" />
              <span className="text-lg font-black text-white uppercase tracking-tight">
                {SITE_NAME}
              </span>
            </div>
            <button onClick={() => setIsMenuOpen(false)} className="text-white p-2">
              <X className="w-8 h-8" />
            </button>
          </div>

          <nav className="flex flex-col gap-6 text-xl font-bold text-white/95 mb-12">
            <Link to="/" onClick={() => { setIsMenuOpen(false); handleNavClick('#home'); }} className="hover:text-emerald-400">Home</Link>
            <a href="#como-funciona" onClick={(e) => { e.preventDefault(); setIsMenuOpen(false); handleNavClick('#como-funciona'); }} className="hover:text-emerald-400">Como Funciona</a>
            <a href="#plano" onClick={(e) => { e.preventDefault(); setIsMenuOpen(false); handleNavClick('#plano'); }} className="hover:text-emerald-400">Plano de Negócios</a>
            <a href="#beneficios" onClick={(e) => { e.preventDefault(); setIsMenuOpen(false); handleNavClick('#beneficios'); }} className="hover:text-emerald-400">Benefícios</a>
            <a href="#faq" onClick={(e) => { e.preventDefault(); setIsMenuOpen(false); handleNavClick('#faq'); }} className="hover:text-emerald-400">FAQ</a>
            <a href="#contato" onClick={(e) => { e.preventDefault(); setIsMenuOpen(false); handleNavClick('#contato'); }} className="hover:text-emerald-400">Contato</a>
            
            <div className="h-px bg-white/10 my-2"></div>
            
            <Link to="/register" onClick={() => setIsMenuOpen(false)} className="hover:text-emerald-400">Cadastre-se</Link>
            <Link to="/login" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 text-emerald-400">
              <User className="w-6 h-6" />
              Minha Conta
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;

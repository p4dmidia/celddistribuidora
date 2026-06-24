import React from 'react';
import { CheckCircle2, Users, TrendingUp, Award, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

const BusinessOpportunity: React.FC = () => {
  return (
    <section className="bg-[#0B1221] py-20 text-white relative overflow-hidden">
      <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-8">
          <h2 className="text-4xl md:text-5xl font-extrabold leading-tight">
            Transforme sua rede em <br />
            <span className="text-emerald-500">um negócio de sucesso.</span>
          </h2>
          <p className="text-slate-400 text-lg">
            O Negócio CELD permite que você se torne um parceiro e lucre com o consumo e a indicação de cestas básicas. Faça parte de uma rede que cresce com você.
          </p>

          <ul className="space-y-4">
            <li className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="font-medium">Comissões atrativas em cada indicação</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="font-medium">Suporte e treinamento completo</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="font-medium">Produtos essenciais de alta demanda (Cesta Básica)</span>
            </li>
          </ul>

          <Link to="/register" className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-10 rounded-lg shadow-lg shadow-emerald-500/20 transition-all text-center">
            QUERO SER UM AFILIADO
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
          <div className="bg-[#1A212E] p-8 rounded-xl border border-white/5 hover:border-emerald-500/30 transition-all flex flex-col gap-4 sm:col-span-2">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <Users className="text-emerald-500 w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-xl mb-1">Rede</h4>
              <p className="text-sm text-slate-400">Construa sua própria equipe de consumo inteligente.</p>
            </div>
          </div>

          <div className="bg-[#1A212E] p-8 rounded-xl border border-white/5 hover:border-emerald-500/30 transition-all flex flex-col gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-emerald-500 w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-xl mb-1">Escalabilidade</h4>
              <p className="text-sm text-slate-400">Ganhos em múltiplos níveis conforme sua rede cresce.</p>
            </div>
          </div>

          <div className="bg-[#1A212E] p-8 rounded-xl border border-white/5 hover:border-emerald-500/30 transition-all flex flex-col gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <Award className="text-emerald-500 w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-xl mb-1">Graduações</h4>
              <p className="text-sm text-slate-400">Plano de carreira estruturado para líderes.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BusinessOpportunity;

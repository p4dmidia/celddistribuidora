import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  Users, 
  TrendingUp, 
  MapPin, 
  HelpCircle, 
  ArrowRight, 
  ShoppingBag, 
  UserPlus, 
  Utensils, 
  Sparkles,
  Phone,
  Mail,
  ChevronDown
} from 'lucide-react';
import { SITE_NAME } from '../lib/config';

const HomePage: React.FC = () => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: 'O que está incluso no Plano Único de R$ 300,00?',
      a: 'O plano único inclui a sua ativação na rede de Marketing Multinível da CELD, o direito de receber mensalmente uma Cesta Básica de alimentos de altíssima qualidade na sua residência e a possibilidade de receber comissões pelas indicações da sua rede.'
    },
    {
      q: 'Como funcionam os bônus de indicação?',
      a: 'Você recebe um Bônus Direto de 10% (R$ 30,00) sobre cada compra realizada pelos seus indicados diretos (Nível 1). Além disso, você participa do Bônus Unilevel que distribui mais 30,05% divididos do 2º ao 10º nível da sua rede de indicações indiretas.'
    },
    {
      q: 'Como mantenho minha conta ativa para receber comissões?',
      a: 'Para se manter ativo e apto a receber comissões de sua rede, você deve realizar a aquisição recorrente mensal de sua cesta básica no valor de R$ 300,00. Caso não pague a mensalidade, sua conta ficará inativa e você não participará das distribuições.'
    },
    {
      q: 'Quais são as opções de pagamento aceitas?',
      a: 'Para facilitar a sua ativação e renovação, aceitamos pagamentos via PIX (confirmação imediata), Cartão de Crédito e Boleto Bancário.'
    },
    {
      q: 'Quando posso solicitar meus saques?',
      a: 'As solicitações de saque de seu saldo disponível podem ser realizadas todas as segundas-feiras diretamente no seu Escritório Virtual. O prazo de processamento e pagamento em sua conta é até a sexta-feira da mesma semana.'
    }
  ];

  return (
    <div className="bg-slate-50 font-sans" id="home">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white py-16 lg:py-28">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-emerald-50/50 rounded-l-[10rem] -z-10 hidden lg:block"></div>
        <div className="container mx-auto px-4 grid lg:grid-cols-2 items-center gap-12">
          <div className="space-y-6 max-w-xl">
            <span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-bold tracking-wider uppercase px-4 py-1.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              Oportunidade MMN Cesta Básica
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-800 leading-[1.15]">
              Alimentação de qualidade e <br />
              <span className="bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">renda extra mensal.</span>
            </h1>
            <p className="text-slate-500 text-lg leading-relaxed font-inter">
              Faça parte da {SITE_NAME}. Mude a realidade financeira da sua família consumindo o que você já consome todos os meses e compartilhando essa oportunidade.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link to="/register" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2">
                Começar Agora
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#como-funciona" className="border-2 border-slate-200 hover:border-emerald-500 text-slate-700 hover:text-emerald-600 font-bold py-4 px-8 rounded-2xl transition-all text-center">
                Como Funciona
              </a>
            </div>
          </div>

          <div className="relative group flex justify-center">
            <div className="absolute -inset-4 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors"></div>
            <img
              src="/assets/cesta_basica.png"
              alt="Cesta Básica Premium CELD"
              className="relative w-full max-w-md h-auto object-contain rounded-3xl drop-shadow-[0_20px_40px_rgba(16,185,129,0.15)]"
            />
          </div>
        </div>
      </section>

      {/* Como Funciona Section */}
      <section className="py-24 bg-slate-50 border-t border-b border-slate-100" id="como-funciona">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800">
              Três passos simples para o sucesso
            </h2>
            <p className="text-slate-500 font-medium font-inter">
              Nosso sistema foi feito para ser simples de entender e fácil de duplicar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <UserPlus className="w-8 h-8" />
              </div>
              <h3 className="font-extrabold text-xl text-slate-800 mb-2">1. Cadastro Simples</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-inter">
                Registre-se utilizando o link de indicação do seu patrocinador e configure sua conta no portal.
              </p>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="font-extrabold text-xl text-slate-800 mb-2">2. Ativação / Mensalidade</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-inter">
                Adquira sua cesta básica por R$ 300,00. Isso ativa seu cadastro na rede e garante a entrega dos seus alimentos.
              </p>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="font-extrabold text-xl text-slate-800 mb-2">3. Compartilhe e Ganhe</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-inter">
                Divulgue seu link de indicação. Receba bônus de indicação direta (10%) e indireta até o 10º nível da sua rede.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Plano de Negócios Section */}
      <section className="py-24 bg-white" id="plano">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-12 gap-16 items-center">
            <div className="lg:col-span-5 space-y-8">
              <span className="bg-emerald-50 text-emerald-700 text-xs font-bold tracking-wider uppercase px-4 py-1.5 rounded-full">
                Plano MMN Sustentável
              </span>
              <h2 className="text-3xl md:text-5xl font-extrabold text-slate-800 leading-tight">
                Um plano generoso feito <br />
                <span className="text-emerald-500">para durar.</span>
              </h2>
              <p className="text-slate-500 text-md leading-relaxed font-inter">
                Com base no consumo de alimentos essenciais, o plano da CELD distribui um total de 40,05% sobre cada cesta básica mensal de R$ 300,00 comprada pela sua rede.
              </p>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-6 h-6 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">Bônus Direto (10%)</h4>
                    <p className="text-slate-500 text-sm font-inter">R$ 30,00 por indicação direta de novos afiliados ou recorrência mensal.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">Bônus Unilevel (Até 10 Níveis)</h4>
                    <p className="text-slate-500 text-sm font-inter">Comissões indiretas de até 30,05% distribuídas do 2º ao 10º nível da sua rede.</p>
                  </div>
                </div>
              </div>

              <Link to="/register" className="inline-flex bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-10 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all text-center">
                Quero Participar
              </Link>
            </div>

            <div className="lg:col-span-7 bg-slate-50 p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-inner">
              <h4 className="font-extrabold text-slate-800 text-lg mb-6 uppercase tracking-wider text-center">Proposta de Comissionamento</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-500">
                  <thead className="text-xs uppercase bg-white rounded-xl text-slate-700 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 font-black rounded-l-xl">Geração / Nível</th>
                      <th className="px-6 py-4 font-black">Porcentagem</th>
                      <th className="px-6 py-4 font-black rounded-r-xl">Valor Pago</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-inter">
                    <tr className="bg-emerald-50/40 text-emerald-900 font-bold">
                      <td className="px-6 py-4">Nível 1 (Bônus Direto)</td>
                      <td className="px-6 py-4">10,00%</td>
                      <td className="px-6 py-4">R$ 30,00</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4">Nível 2</td>
                      <td className="px-6 py-4">5,00%</td>
                      <td className="px-6 py-4">R$ 15,00</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4">Nível 3</td>
                      <td className="px-6 py-4">4,00%</td>
                      <td className="px-6 py-4">R$ 12,00</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4">Nível 4 ao 9</td>
                      <td className="px-6 py-4">3,00% (cada)</td>
                      <td className="px-6 py-4">R$ 9,00 (cada)</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4">Nível 10</td>
                      <td className="px-6 py-4">3,05%</td>
                      <td className="px-6 py-4">R$ 9,15</td>
                    </tr>
                    <tr className="bg-white font-extrabold text-slate-800 border-t-2 border-slate-200">
                      <td className="px-6 py-4 rounded-b-xl">Total Distribuído</td>
                      <td className="px-6 py-4">40,05%</td>
                      <td className="px-6 py-4 rounded-b-xl">R$ 120,15</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefícios Section */}
      <section className="py-24 bg-slate-50 border-t border-slate-100" id="beneficios">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800">
              Vantagens de ser CELD Distribuidora
            </h2>
            <p className="text-slate-500 font-medium font-inter">
              Conectamos alimentação saudável e essencial a um plano financeiro poderoso.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex gap-6 items-start">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                <Utensils className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-800 text-lg">Alimentos Selecionados</h4>
                <p className="text-slate-500 text-sm leading-relaxed font-inter">
                  Sua cesta básica mensal é repleta de marcas de confiança e itens essenciais para sua casa.
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex gap-6 items-start">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-800 text-lg">Renda Residual Mensal</h4>
                <p className="text-slate-500 text-sm leading-relaxed font-inter">
                  Ganhe todos os meses na recompra da cesta básica que seus afiliados realizam de forma recorrente.
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex gap-6 items-start">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-800 text-lg">Praticidade de Entrega</h4>
                <p className="text-slate-500 text-sm leading-relaxed font-inter">
                  Receba os alimentos diretamente em seu endereço com segurança e total comodidade.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-white" id="faq">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl font-extrabold text-slate-800">
              Dúvidas Frequentes
            </h2>
            <p className="text-slate-500 font-medium font-inter">
              Tem alguma pergunta? Encontre as respostas mais comuns sobre o plano.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div key={idx} className="border border-slate-100 rounded-3xl overflow-hidden bg-slate-50/50">
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full flex justify-between items-center px-8 py-6 text-left font-bold text-slate-800 hover:text-emerald-600 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 transition-transform text-slate-400 ${isOpen ? 'rotate-180 text-emerald-500' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-8 pb-6 text-slate-500 text-sm leading-relaxed border-t border-slate-100 pt-4 bg-white font-inter">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contato Section */}
      <section className="py-24 bg-slate-50 border-t border-slate-100" id="contato">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="bg-[#0B1221] rounded-[3.5rem] p-10 md:p-16 text-white grid lg:grid-cols-2 gap-12 relative overflow-hidden shadow-2xl">
            <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full"></div>
            <div className="space-y-6 relative z-10">
              <h2 className="text-3xl md:text-4xl font-extrabold leading-tight">
                Precisa de mais informações <br />
                <span className="text-emerald-400">ou suporte?</span>
              </h2>
              <p className="text-slate-400 font-inter">
                Estamos prontos para atender você e ajudar a crescer sua equipe na CELD Distribuidora.
              </p>
              
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-emerald-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-semibold font-inter">suporte@celddistribuidora.com.br</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-emerald-400">
                    <Phone className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-semibold font-inter">(41) 99628-5667</span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 relative z-10 flex flex-col justify-center text-center gap-6">
              <div className="w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center text-white mx-auto shadow-lg shadow-emerald-500/25">
                <HelpCircle className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-extrabold text-xl text-white mb-2">Central de Atendimento</h4>
                <p className="text-slate-400 text-sm font-inter">
                  Fale diretamente com nossa equipe no WhatsApp para tirar dúvidas de cadastro e pagamentos.
                </p>
              </div>
              <a 
                href="https://api.whatsapp.com/send/?phone=5541996285667&text=Ol%C3%A1%2C+preciso+de+suporte+CELD%2C+pode+me+ajudar%3F&type=phone_number&app_absent=0"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all uppercase tracking-widest text-xs"
              >
                Conversar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;

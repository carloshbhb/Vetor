'use client';

import { useState } from 'react';
import { outreachTemplates, generateGuestPostPitch, backlinkAuditChecklist } from '@/lib/backlinks';
import Logo from '@/components/Logo';

export default function BacklinksPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'outreach' | 'audit'>('dashboard');
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  const copyToClipboard = (text: string, templateName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplate(templateName);
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="/">
            <Logo />
          </a>
          <h1 className="font-syne font-bold text-lg text-text">Backlinks & Guest Posts</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-border">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'dashboard'
                ? 'text-blue border-b-2 border-blue'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('outreach')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'outreach'
                ? 'text-blue border-b-2 border-blue'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Templates de Outreach
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'audit'
                ? 'text-blue border-b-2 border-blue'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Checklist de Auditoria
          </button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-border p-6">
                <p className="text-sm text-text-muted mb-1">Total de Backlinks</p>
                <p className="font-bebas text-3xl text-text">--</p>
                <p className="text-xs text-text-muted">Configure API para dados</p>
              </div>
              <div className="bg-white rounded-xl border border-border p-6">
                <p className="text-sm text-text-muted mb-1">Domínios Únicos</p>
                <p className="font-bebas text-3xl text-text">--</p>
                <p className="text-xs text-text-muted">Configure API para dados</p>
              </div>
              <div className="bg-white rounded-xl border border-border p-6">
                <p className="text-sm text-text-muted mb-1">DA Médio</p>
                <p className="font-bebas text-3xl text-text">--</p>
                <p className="text-xs text-text-muted">Configure API para dados</p>
              </div>
              <div className="bg-white rounded-xl border border-border p-6">
                <p className="text-sm text-text-muted mb-1">Score de Backlinks</p>
                <p className="font-bebas text-3xl text-blue">--</p>
                <p className="text-xs text-text-muted">Configure API para dados</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-border p-6">
              <h2 className="font-syne font-bold text-lg text-text mb-4">Ações Rápidas</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => copyToClipboard(generateGuestPostPitch('example.com', 'tecnologia'), 'pitch')}
                  className="p-4 bg-blue/5 rounded-xl border border-blue/20 hover:bg-blue/10 transition-colors text-left"
                >
                  <p className="font-medium text-text mb-1">Gerar Pitch para Guest Post</p>
                  <p className="text-xs text-text-muted">Copia pitch personalizado para outreach</p>
                </button>
                <a
                  href="https://search.google.com/search-console/links"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 bg-green-50 rounded-xl border border-green-200 hover:bg-green-100 transition-colors text-left"
                >
                  <p className="font-medium text-text mb-1">Google Search Console</p>
                  <p className="text-xs text-text-muted">Ver backlinks no GSC</p>
                </a>
                <a
                  href="https://ahrefs.com/backlink-checker"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 bg-orange-50 rounded-xl border border-orange-200 hover:bg-orange-100 transition-colors text-left"
                >
                  <p className="font-medium text-text mb-1">Ahrefs Backlink Checker</p>
                  <p className="text-xs text-text-muted">Verificar backlinks (gratuito)</p>
                </a>
              </div>
            </div>

            {/* Guest Post Opportunities */}
            <div className="bg-white rounded-xl border border-border p-6">
              <h2 className="font-syne font-bold text-lg text-text mb-4">Oportunidades de Guest Post</h2>
              <p className="text-sm text-text-muted mb-4">
                Sites para contato para publicação de artigos:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-text-muted">Domínio</th>
                      <th className="text-left py-3 px-4 font-medium text-text-muted">DA</th>
                      <th className="text-left py-3 px-4 font-medium text-text-muted">Nicho</th>
                      <th className="text-left py-3 px-4 font-medium text-text-muted">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-text-muted">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="py-3 px-4">exemplo.com.br</td>
                      <td className="py-3 px-4">--</td>
                      <td className="py-3 px-4">Tecnologia</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                          Pendente
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button className="text-blue hover:underline text-xs">Copiar Pitch</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-text-muted mt-4">
                * Adicione oportunidades na tabela acima ou importe de planilha
              </p>
            </div>
          </div>
        )}

        {/* Outreach Templates Tab */}
        {activeTab === 'outreach' && (
          <div className="space-y-6">
            {/* Guest Post Template */}
            <div className="bg-white rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-syne font-bold text-lg text-text">Template de Guest Post</h2>
                <button
                  onClick={() => copyToClipboard(outreachTemplates.guestPost.body, 'guest-post')}
                  className="px-4 py-2 bg-blue text-white rounded-lg hover:bg-blue/90 transition-colors text-sm"
                >
                  {copiedTemplate === 'guest-post' ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <pre className="bg-bg2 rounded-lg p-4 text-sm text-text whitespace-pre-wrap font-mono">
                {outreachTemplates.guestPost.body}
              </pre>
            </div>

            {/* Resource Page Template */}
            <div className="bg-white rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-syne font-bold text-lg text-text">Template de Página de Recursos</h2>
                <button
                  onClick={() => copyToClipboard(outreachTemplates.resourcePage.body, 'resource')}
                  className="px-4 py-2 bg-blue text-white rounded-lg hover:bg-blue/90 transition-colors text-sm"
                >
                  {copiedTemplate === 'resource' ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <pre className="bg-bg2 rounded-lg p-4 text-sm text-text whitespace-pre-wrap font-mono">
                {outreachTemplates.resourcePage.body}
              </pre>
            </div>

            {/* Broken Link Template */}
            <div className="bg-white rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-syne font-bold text-lg text-text">Template de Link Quebrado</h2>
                <button
                  onClick={() => copyToClipboard(outreachTemplates.brokenLink.body, 'broken')}
                  className="px-4 py-2 bg-blue text-white rounded-lg hover:bg-blue/90 transition-colors text-sm"
                >
                  {copiedTemplate === 'broken' ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <pre className="bg-bg2 rounded-lg p-4 text-sm text-text whitespace-pre-wrap font-mono">
                {outreachTemplates.brokenLink.body}
              </pre>
            </div>
          </div>
        )}

        {/* Audit Checklist Tab */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            {backlinkAuditChecklist.map((category, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-border p-6">
                <h2 className="font-syne font-bold text-lg text-text mb-4">{category.category}</h2>
                <div className="space-y-3">
                  {category.items.map((item, itemIdx) => (
                    <label
                      key={itemIdx}
                      className="flex items-start gap-3 p-3 bg-bg2 rounded-lg hover:bg-bg transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 w-4 h-4 text-blue rounded border-border focus:ring-blue"
                      />
                      <span className="text-sm text-text">{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {/* Additional Tips */}
            <div className="bg-blue/5 rounded-xl border border-blue/20 p-6">
              <h3 className="font-syne font-bold text-text mb-2">Dicas para Construção de Backlinks</h3>
              <ul className="space-y-2 text-sm text-text-2">
                <li>• Crie conteúdo de alta qualidade que seja naturalmente compartilhável</li>
                <li>• Participe de fóruns e comunidades do seu nicho</li>
                <li>• Ofereça guest posts para sites relevantes</li>
                <li>• Use o skyscraper technique: encontre conteúdo popular e crie algo melhor</li>
                <li>• Monitore menções à sua marca e peça links quando não estiverem presentes</li>
                <li>• Evite práticas de black hat SEO (compra de links, spam, etc.)</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
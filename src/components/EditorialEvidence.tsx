import Link from 'next/link';

function freshnessLabel(updatedAt?: string): {
  label: string;
  detail: string;
  tone: 'fresh' | 'review' | 'stale';
} {
  if (!updatedAt) {
    return {
      label: 'Data de revisão não informada',
      detail: 'A página deve ser revisada antes de usar informações comerciais como referência.',
      tone: 'stale',
    };
  }

  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) {
    return {
      label: 'Data de revisão inválida',
      detail: 'A página deve ser revisada antes de usar informações comerciais como referência.',
      tone: 'stale',
    };
  }

  const ageDays = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));

  if (ageDays <= 90) {
    return {
      label: 'Conteúdo revisado recentemente',
      detail: 'A data abaixo indica a última atualização editorial registrada para esta página.',
      tone: 'fresh',
    };
  }

  if (ageDays <= 180) {
    return {
      label: 'Revisão recomendada',
      detail: 'Vale conferir preço, disponibilidade e concorrentes antes de comprar.',
      tone: 'review',
    };
  }

  return {
    label: 'Revisão prioritária',
    detail: 'Preço, disponibilidade e cenário competitivo podem ter mudado desde a última atualização.',
    tone: 'stale',
  };
}

export default function EditorialEvidence({ updatedAt }: { updatedAt?: string }) {
  const date = updatedAt ? new Date(updatedAt) : null;
  const formatted =
    date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '';
  const freshness = freshnessLabel(updatedAt);

  return (
    <aside id="base-da-analise" className="editorial-evidence" aria-labelledby="base-da-analise-heading">
      <div className="editorial-evidence-icon" aria-hidden="true">✓</div>
      <div>
        <h3 id="base-da-analise-heading">Base desta análise</h3>
        <p>
          O Vetor separa especificações e informações publicadas por fabricante, comparação editorial e dados comerciais consultados. Alegações de teste ou experiência prática só devem aparecer quando documentadas para a página.
        </p>
        <div className="editorial-evidence-list">
          <span>Informações técnicas e comerciais verificáveis</span>
          <span>Comparação com alternativas relevantes</span>
          <span>{formatted ? 'Página revisada em ' + formatted : 'Data de revisão exibida na página'}</span>
        </div>
        <p className={`editorial-freshness editorial-freshness--${freshness.tone}`} aria-label={freshness.label}>
          <strong>{freshness.label}</strong> — {freshness.detail}
        </p>
        <Link href="/como-avaliamos/">Conheça a metodologia completa →</Link>
      </div>
    </aside>
  );
}

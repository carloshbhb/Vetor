import Link from 'next/link';

export default function EditorialEvidence({ updatedAt }: { updatedAt?: string }) {
  const date = updatedAt ? new Date(updatedAt) : null;
  const formatted =
    date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '';

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
        <Link href="/como-avaliamos/">Conheça a metodologia completa →</Link>
      </div>
    </aside>
  );
}

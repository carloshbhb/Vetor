// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — AI Citation Monitor (GEO Tracking)
// ─────────────────────────────────────────────────────────────────────────────
// Rastreia citações do Vetor Blog em motores generativos de IA

export interface CitationRecord {
  id: string;
  source: string;        // ex: 'chatgpt', 'perplexity', 'google-ai-overview'
  query: string;         // A consulta que gerou a citação
  citedUrl: string;      // URL do Vetor Blog citada
  citedPage: string;     // Título da página citada
  context: string;       // Trecho onde a marca foi citada
  detectedAt: string;
  verified: boolean;
}

export interface CitationStats {
  totalCitations: number;
  bySource: Record<string, number>;
  topCitedPages: { page: string; count: number }[];
  lastDetected: string;
}

// Simula banco de dados de citações (em produção, usar Supabase)
const citations: CitationRecord[] = [];

export function addCitation(citation: Omit<CitationRecord, 'id' | 'detectedAt' | 'verified'>): CitationRecord {
  const newCitation: CitationRecord = {
    ...citation,
    id: crypto.randomUUID(),
    detectedAt: new Date().toISOString(),
    verified: false,
  };
  citations.push(newCitation);
  return newCitation;
}

export function getCitationStats(): CitationStats {
  const bySource: Record<string, number> = {};
  const pageCounts: Record<string, number> = {};

  for (const c of citations) {
    bySource[c.source] = (bySource[c.source] || 0) + 1;
    pageCounts[c.citedPage] = (pageCounts[c.citedPage] || 0) + 1;
  }

  const topCitedPages = Object.entries(pageCounts)
    .map(([page, count]) => ({ page, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalCitations: citations.length,
    bySource,
    topCitedPages,
    lastDetected: citations.length > 0
      ? citations[citations.length - 1].detectedAt
      : new Date().toISOString(),
  };
}

export function getRecentCitations(limit: number = 10): CitationRecord[] {
  return citations.slice(-limit).reverse();
}

export function verifyCitation(id: string): boolean {
  const citation = citations.find(c => c.id === id);
  if (citation) {
    citation.verified = true;
    return true;
  }
  return false;
}

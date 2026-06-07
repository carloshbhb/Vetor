// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — AI Citation Monitor (GEO Tracking)
// ─────────────────────────────────────────────────────────────────────────────
// Rastreia citações do Vetor Blog em motores generativos de IA
// Migrated from in-memory to Supabase with in-memory fallback

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─── Types ──────────────────────────────────────────────────────────────────

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

// ─── Supabase Client ────────────────────────────────────────────────────────

let _supabase: SupabaseClient | null = null;
let _supabaseChecked = false;

function getSupabase(): SupabaseClient | null {
  if (_supabaseChecked) return _supabase;
  _supabaseChecked = true;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    _supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
  } else {
    _supabase = null;
  }

  return _supabase;
}

// ─── In-Memory Fallback ─────────────────────────────────────────────────────

const citationsMemory: CitationRecord[] = [];
const MAX_CITATIONS = 2000;

// ─── Database Functions ─────────────────────────────────────────────────────

export async function addCitation(citation: Omit<CitationRecord, 'id' | 'detectedAt' | 'verified'>): Promise<CitationRecord> {
  const newCitation: CitationRecord = {
    ...citation,
    id: crypto.randomUUID(),
    detectedAt: new Date().toISOString(),
    verified: false,
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase
        .from('ai_citations')
        .insert({
          id: newCitation.id,
          source: newCitation.source,
          query: newCitation.query,
          cited_url: newCitation.citedUrl,
          cited_page: newCitation.citedPage,
          context: newCitation.context,
          detected_at: newCitation.detectedAt,
          verified: newCitation.verified,
        });

      if (error) throw error;
      return newCitation;
    } catch (error) {
      console.error('[AI Citations] Failed to save to Supabase:', error);
    }
  }

  // Fallback to memory
  citationsMemory.push(newCitation);
  if (citationsMemory.length > MAX_CITATIONS) citationsMemory.shift();
  return newCitation;
}

export async function getCitationStats(): Promise<CitationStats> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      // Get total count
      const { count: totalCitations } = await supabase
        .from('ai_citations')
        .select('*', { count: 'exact', head: true });

      // Get count by source
      const { data: sourceData } = await supabase
        .from('ai_citations')
        .select('source');

      const bySource: Record<string, number> = {};
      if (sourceData) {
        for (const row of sourceData) {
          bySource[row.source] = (bySource[row.source] || 0) + 1;
        }
      }

      // Get top cited pages
      const { data: pageData } = await supabase
        .from('ai_citations')
        .select('cited_page');

      const pageCounts: Record<string, number> = {};
      if (pageData) {
        for (const row of pageData) {
          pageCounts[row.cited_page] = (pageCounts[row.cited_page] || 0) + 1;
        }
      }

      const topCitedPages = Object.entries(pageCounts)
        .map(([page, count]) => ({ page, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Get last detected
      const { data: lastData } = await supabase
        .from('ai_citations')
        .select('detected_at')
        .order('detected_at', { ascending: false })
        .limit(1)
        .single();

      return {
        totalCitations: totalCitations || 0,
        bySource,
        topCitedPages,
        lastDetected: lastData?.detected_at || new Date().toISOString(),
      };
    } catch (error) {
      console.error('[AI Citations] Failed to fetch stats from Supabase:', error);
    }
  }

  // Fallback to memory
  const bySource: Record<string, number> = {};
  const pageCounts: Record<string, number> = {};

  for (const c of citationsMemory) {
    bySource[c.source] = (bySource[c.source] || 0) + 1;
    pageCounts[c.citedPage] = (pageCounts[c.citedPage] || 0) + 1;
  }

  const topCitedPages = Object.entries(pageCounts)
    .map(([page, count]) => ({ page, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalCitations: citationsMemory.length,
    bySource,
    topCitedPages,
    lastDetected: citationsMemory.length > 0
      ? citationsMemory[citationsMemory.length - 1].detectedAt
      : new Date().toISOString(),
  };
}

export async function getRecentCitations(limit: number = 10): Promise<CitationRecord[]> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('ai_citations')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        source: row.source,
        query: row.query,
        citedUrl: row.cited_url,
        citedPage: row.cited_page,
        context: row.context,
        detectedAt: row.detected_at,
        verified: row.verified,
      }));
    } catch (error) {
      console.error('[AI Citations] Failed to fetch from Supabase:', error);
    }
  }

  // Fallback to memory
  return citationsMemory.slice(-limit).reverse();
}

export async function verifyCitation(id: string): Promise<boolean> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { error } = await supabase
        .from('ai_citations')
        .update({ verified: true })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('[AI Citations] Failed to verify in Supabase:', error);
    }
  }

  // Fallback to memory
  const citation = citationsMemory.find(c => c.id === id);
  if (citation) {
    citation.verified = true;
    return true;
  }
  return false;
}

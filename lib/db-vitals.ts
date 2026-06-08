import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

export interface VitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
  url: string;
  userAgent: string;
  timestamp: string;
}

// In-memory fallback
const vitalsMemory: VitalMetric[] = [];
const MAX_VITALS = 5000;

export async function getWebVitals(): Promise<{ metrics: VitalMetric[]; aggregates: Aggregates; total: number }> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error, count } = await supabase
        .from('web_vitals')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;

      const metrics = (data || []).map(row => ({
        name: row.name,
        value: row.value,
        rating: row.rating,
        delta: row.delta,
        id: row.id,
        navigationType: row.navigation_type,
        url: row.url,
        userAgent: row.user_agent,
        timestamp: row.timestamp,
      }));

      const aggregates = calculateAggregatesFromRows(data || []);

      return {
        metrics,
        aggregates,
        total: count || 0,
      };
    } catch (error) {
      console.error('[DB] Failed to fetch web vitals from Supabase:', error);
    }
  }

  // Fallback to memory
  const aggregates = calculateAggregates(vitalsMemory);
  return {
    metrics: vitalsMemory.slice(0, 100),
    aggregates,
    total: vitalsMemory.length,
  };
}

export async function createVitalMetric(metric: Omit<VitalMetric, 'id'> & { id?: string }): Promise<void> {
  const supabase = getSupabase();
  const vital: VitalMetric = {
    ...metric,
    id: metric.id || `vital-${Date.now()}`,
  };

  if (supabase) {
    try {
      const { error } = await supabase
        .from('web_vitals')
        .insert({
          name: vital.name,
          value: vital.value,
          rating: vital.rating,
          delta: vital.delta,
          id: vital.id,
          navigation_type: vital.navigationType,
          url: vital.url,
          user_agent: vital.userAgent,
          timestamp: vital.timestamp,
        });

      if (error) throw error;
      return;
    } catch (error) {
      console.error('[DB] Failed to create vital metric in Supabase:', error);
    }
  }

  // Fallback to memory
  vitalsMemory.unshift(vital);
  if (vitalsMemory.length > MAX_VITALS) vitalsMemory.pop();
}

interface Aggregates {
  [name: string]: {
    p50: number;
    p75: number;
    p95: number;
    rating: string;
  };
}

function calculateAggregatesFromRows(rows: any[]): Aggregates {
  const byName: Record<string, { values: number[]; ratings: Record<string, number> }> = {};

  for (const row of rows) {
    if (!byName[row.name]) {
      byName[row.name] = { values: [], ratings: { good: 0, 'needs-improvement': 0, poor: 0 } };
    }
    byName[row.name].values.push(row.value);
    byName[row.name].ratings[row.rating]++;
  }

  return calculateAggregatesFromData(byName);
}

function calculateAggregates(metrics: VitalMetric[]): Aggregates {
  const byName: Record<string, { values: number[]; ratings: Record<string, number> }> = {};

  for (const metric of metrics) {
    if (!byName[metric.name]) {
      byName[metric.name] = { values: [], ratings: { good: 0, 'needs-improvement': 0, poor: 0 } };
    }
    byName[metric.name].values.push(metric.value);
    byName[metric.name].ratings[metric.rating]++;
  }

  return calculateAggregatesFromData(byName);
}

function calculateAggregatesFromData(byName: Record<string, { values: number[]; ratings: Record<string, number> }>): Aggregates {
  const aggregates: Aggregates = {};

  for (const [name, data] of Object.entries(byName)) {
    const sorted = data.values.sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p75 = sorted[Math.floor(sorted.length * 0.75)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];

    const total = data.ratings.good + data.ratings['needs-improvement'] + data.ratings.poor;
    const goodPercentage = data.ratings.good / total;
    
    let rating = 'good';
    if (goodPercentage < 0.5) rating = 'poor';
    else if (goodPercentage < 0.75) rating = 'needs-improvement';

    aggregates[name] = { p50, p75, p95, rating };
  }

  return aggregates;
}

import { createAgentDBAdapter } from 'agentic-flow/reasoningbank';

let adapterInstance: ReturnType<typeof createAgentDBAdapter> | null = null;

export async function getMemoryAdapter() {
  if (adapterInstance) return adapterInstance;

  adapterInstance = await createAgentDBAdapter({
    dbPath: '.agentdb.db',
    enableLearning: true,
    enableReasoning: true,
    quantizationType: 'scalar',
    cacheSize: 1000,
  });

  return adapterInstance;
}

export interface Lesson {
  id?: string;
  lesson: string;
  domain: string;
  tags: string[];
  confidence: number;
  evidence: string;
  timestamp: number;
  success: boolean;
}

export interface Pattern {
  id?: string;
  trigger: string;
  response: string;
  domain: string;
  context: Record<string, unknown>;
  success: boolean;
  confidence: number;
  usageCount: number;
}

export async function storeLesson(lesson: Omit<Lesson, 'id' | 'timestamp'>): Promise<string> {
  const adapter = await getMemoryAdapter();
  
  const patternId = await adapter.insertPattern({
    id: '',
    type: 'lesson',
    domain: lesson.domain,
    pattern_data: JSON.stringify({
      lesson: lesson.lesson,
      tags: lesson.tags,
      evidence: lesson.evidence,
      success: lesson.success,
    }),
    confidence: lesson.confidence,
    usage_count: 1,
    success_count: lesson.success ? 1 : 0,
    created_at: Date.now(),
    last_used: Date.now(),
  });

  return patternId;
}

export async function storePattern(pattern: Omit<Pattern, 'id' | 'usageCount'>): Promise<string> {
  const adapter = await getMemoryAdapter();
  
  const patternId = await adapter.insertPattern({
    id: '',
    type: 'pattern',
    domain: pattern.domain,
    pattern_data: JSON.stringify({
      trigger: pattern.trigger,
      response: pattern.response,
      context: pattern.context,
      success: pattern.success,
    }),
    confidence: pattern.confidence,
    usage_count: 1,
    success_count: pattern.success ? 1 : 0,
    created_at: Date.now(),
    last_used: Date.now(),
  });

  return patternId;
}

export async function retrieveLessons(
  query: string,
  domain?: string,
  minConfidence = 0.7,
  limit = 10
): Promise<Lesson[]> {
  const adapter = await getMemoryAdapter();
  
  const queryEmbedding = await computeEmbedding(query);
  
  const context = await adapter.retrieveWithReasoning(queryEmbedding, {
    domain: domain || 'all',
    k: limit,
    useMMR: true,
    synthesizeContext: true,
  });

  return context.patterns
    .filter((p: any) => p.confidence >= minConfidence)
    .map((p: any) => ({
      id: p.id,
      lesson: p.pattern_data?.lesson || '',
      domain: p.domain,
      tags: p.pattern_data?.tags || [],
      confidence: p.confidence,
      evidence: p.pattern_data?.evidence || '',
      timestamp: p.created_at,
      success: p.pattern_data?.success || false,
    }));
}

export async function retrievePatterns(
  trigger: string,
  domain?: string,
  minConfidence = 0.7
): Promise<Pattern[]> {
  const adapter = await getMemoryAdapter();
  
  const queryEmbedding = await computeEmbedding(trigger);
  
  const context = await adapter.retrieveWithReasoning(queryEmbedding, {
    domain: domain || 'all',
    k: 20,
    useMMR: true,
    synthesizeContext: true,
  });

  return context.patterns
    .filter((p: any) => p.confidence >= minConfidence && p.type === 'pattern')
    .map((p: any) => ({
      id: p.id,
      trigger: p.pattern_data?.trigger || '',
      response: p.pattern_data?.response || '',
      domain: p.domain,
      context: p.pattern_data?.context || {},
      success: p.pattern_data?.success || false,
      confidence: p.confidence,
      usageCount: p.usage_count,
    }));
}

async function computeEmbedding(text: string): Promise<number[]> {
  const adapter = await getMemoryAdapter();
  return await adapter.computeEmbedding(text);
}

export async function trainMemory(domains?: string[]): Promise<void> {
  const adapter = await getMemoryAdapter();
  
  await adapter.train({
    epochs: 50,
    batchSize: 32,
  });
}

export async function getMemoryStats(): Promise<{
  totalPatterns: number;
  totalLessons: number;
  domains: string[];
  memorySize: string;
}> {
  const adapter = await getMemoryAdapter();
  const stats = await adapter.getStats();
  
  return {
    totalPatterns: stats.totalPatterns,
    totalLessons: stats.totalLessons,
    domains: stats.domains,
    memorySize: stats.memorySize,
  };
}

export async function consolidateMemory(): Promise<void> {
  const adapter = await getMemoryAdapter();
  
  await adapter.consolidate({
    strategy: 'importance',
    maxSize: 10000,
    minScore: 0.5,
  });
}

export async function promoteHighConfidenceLessons(minConfidence = 0.85): Promise<string[]> {
  const adapter = await getMemoryAdapter();
  
  const promoted = await adapter.promoteToSkills({
    minConfidence,
    auto: true,
  });
  
  return promoted;
}

export async function exportMemory(outputPath: string): Promise<void> {
  const adapter = await getMemoryAdapter();
  await adapter.export(outputPath);
}

export async function importMemory(inputPath: string): Promise<void> {
  const adapter = await getMemoryAdapter();
  await adapter.import(inputPath);
}
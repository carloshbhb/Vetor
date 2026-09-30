#!/usr/bin/env node
const { consolidateMemory, promoteHighConfidenceLessons, getMemoryStats } = require('../lib/memory.ts');

async function consolidate() {
  try {
    console.log('🧠 Starting memory consolidation...');
    
    const statsBefore = await getMemoryStats();
    console.log(`📊 Before: ${statsBefore.totalPatterns} patterns, ${statsBefore.totalLessons} lessons`);
    
    await consolidateMemory();
    console.log('✅ Memory consolidated');
    
    const promoted = await promoteHighConfidenceLessons(0.85);
    if (promoted.length > 0) {
      console.log(`🚀 Promoted ${promoted.length} lessons to skills:`);
      promoted.forEach(id => console.log(`   - ${id}`));
    }
    
    const statsAfter = await getMemoryStats();
    console.log(`📊 After: ${statsAfter.totalPatterns} patterns, ${statsAfter.totalLessons} lessons`);
    console.log('✅ Memory consolidation complete');
  } catch (error) {
    console.error('❌ Memory consolidation failed:', error);
  }
}

consolidate();
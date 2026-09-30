#!/usr/bin/env node
import { storeLesson, inferDomain, extractTags, closeMemory } from '../lib/memory.mjs';

const [taskId, description, result] = process.argv.slice(2);

if (!taskId || !description) {
  console.log('Usage: capture-lesson.mjs <taskId> <description> [result]');
  process.exit(1);
}

async function capture() {
  try {
    const success = result !== 'failed' && result !== 'error';
    const lesson = {
      lesson: `Task: ${description}. Result: ${result || 'completed'}`,
      domain: inferDomain(description),
      tags: extractTags(description),
      confidence: success ? 0.8 : 0.4,
      evidence: `Task ${taskId}: ${description} -> ${result}`,
      success,
    };
    await storeLesson(lesson);
    console.log(`Lesson captured: ${lesson.domain}`);
  } catch (error) {
    console.error('Failed to capture lesson:', error);
  } finally {
    await closeMemory().catch(() => {});
  }
}

capture();

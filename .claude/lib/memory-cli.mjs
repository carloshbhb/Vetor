import { queryLessons, storeLesson, storePattern, getMemoryStats, closeMemory } from './memory.mjs';

const USAGE = `uso:
  node .claude/lib/memory-cli.mjs query "<task>" [--k=5]
  node .claude/lib/memory-cli.mjs store "<lesson>" [--domain=<dominio>] [--confidence=0.7] [--evidence="<prova>"]
  node .claude/lib/memory-cli.mjs pattern "<trigger>" [--response="<resposta>"] [--confidence=0.5]
  node .claude/lib/memory-cli.mjs stats`;

function parseArgs(rest) {
  const flags = {};
  const positionals = [];
  for (const arg of rest) {
    const match = arg.match(/^--([^=]+)(?:=(.*))?$/);
    if (match) flags[match[1]] = match[2] ?? true;
    else positionals.push(arg);
  }
  return { flags, positionals };
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { flags, positionals } = parseArgs(rest);
  let output = null;

  switch (command) {
    case 'query': {
      const task = positionals[0];
      if (!task) throw new Error('query: informe o task (tópico de busca)');
      output = JSON.stringify(await queryLessons({ task, k: Number(flags.k ?? 5) }), null, 2);
      break;
    }
    case 'store': {
      const lesson = positionals[0];
      if (!lesson) throw new Error('store: informe o texto da lição');
      const id = await storeLesson({
        lesson,
        domain: typeof flags.domain === 'string' ? flags.domain : undefined,
        confidence: flags.confidence !== undefined ? Number(flags.confidence) : undefined,
        evidence: typeof flags.evidence === 'string' ? flags.evidence : undefined,
      });
      output = `lição #${id} gravada (.agentdb.db + LEARNINGS.md)`;
      break;
    }
    case 'pattern': {
      const trigger = positionals[0];
      if (!trigger) throw new Error('pattern: informe o trigger');
      const id = await storePattern({
        trigger,
        response: typeof flags.response === 'string' ? flags.response : undefined,
        confidence: flags.confidence !== undefined ? Number(flags.confidence) : undefined,
      });
      output = `pattern #${id} gravado`;
      break;
    }
    case 'stats': {
      output = JSON.stringify(await getMemoryStats(), null, 2);
      break;
    }
    default:
      throw new Error(USAGE);
  }
  console.log(output);
}

main()
  .then(() => closeMemory())
  .catch(async (error) => {
    console.error(`memory-cli: ${error.message}`);
    process.exitCode = 1;
    await closeMemory();
  });

import { GraphIndex } from '../src/storage/index';
import { performance } from 'perf_hooks';

async function runBenchmark() {
    console.log("Starting benchmark...");
    const index = new GraphIndex('/tmp/fake');
    await index.initialize();

    // Generate synthetic data
    console.log("Generating synthetic data...");

    // Generate N symbols
    const numSymbols = 10000;
    for (let i = 0; i < numSymbols; i++) {
        const symId = `file${i % 100}::func${i}`;
        index.getGraphData().symbols[symId] = {
            id: symId,
            name: `func${i}`,
            kind: 'function',
            filePath: `file${i % 100}`,
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
            language: 'typescript'
        };
    }

    // Generate M relations (calls to some of those symbols)
    const numRelations = 5000;
    for (let i = 0; i < numRelations; i++) {
        const targetFuncName = `func${i * 2 % numSymbols}`;
        const relId = `rel${i}`;
        index.getGraphData().relations[relId] = {
            id: relId,
            sourceId: `file0::caller${i}`,
            targetId: `unknown::${targetFuncName}`,
            kind: 'call',
            certainty: 'UNRESOLVED'
        };
    }

    console.log(`Generated ${numSymbols} symbols and ${numRelations} relations.`);

    const start = performance.now();
    index.resolveRelations();
    const end = performance.now();

    console.log(`resolveRelations took ${end - start} ms`);
}

runBenchmark().catch(console.error);

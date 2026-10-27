import { GraphCache } from './src/storage/cache';
import * as path from 'path';
import * as fs from 'fs';

async function runBenchmark() {
    const workspaceRoot = __dirname;
    const cache = new GraphCache(workspaceRoot);
    const cachePath = cache.getCachePath();

    // Ensure directory exists
    const dir = path.dirname(cachePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Create a large mock cache file
    const mockData = {
        version: '1.0',
        symbols: {},
        relations: {}
    };

    // Add 10,000 mock symbols and relations to simulate a large project
    for (let i = 0; i < 10000; i++) {
        mockData.symbols[`file${i}.ts::func${i}`] = {
            id: `file${i}.ts::func${i}`,
            name: `func${i}`,
            kind: 'function',
            filePath: `file${i}.ts`,
            language: 'typescript',
            range: { start: { line: 0, character: 0 }, end: { line: 10, character: 0 } }
        };
        mockData.relations[`rel${i}`] = {
            id: `rel${i}`,
            sourceId: `file${i}.ts::func${i}`,
            targetId: `file${i+1}.ts::func${i+1}`,
            kind: 'call',
            certainty: 'EXTRACTED'
        };
    }

    fs.writeFileSync(cachePath, JSON.stringify(mockData, null, 2), 'utf-8');
    console.log(`Created mock cache file of size: ${(fs.statSync(cachePath).size / 1024 / 1024).toFixed(2)} MB`);

    // Warmup
    for (let i = 0; i < 5; i++) {
        await cache.load();
    }

    // Benchmark
    const iterations = 20;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        await cache.load();
    }
    const end = performance.now();

    const avgTime = (end - start) / iterations;
    console.log(`Average load time over ${iterations} iterations: ${avgTime.toFixed(2)} ms`);

    // Clean up
    fs.unlinkSync(cachePath);
}

runBenchmark().catch(console.error);

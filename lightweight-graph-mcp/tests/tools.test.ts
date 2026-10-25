import { GraphTools } from '../src/mcp/tools';
import { GraphData } from '../src/common/types';

describe('Graph Tools Tests', () => {
    test('getProjectOverview returns correct stats', () => {
        const mockData: GraphData = {
            version: '1.0',
            symbols: {
                'file1.ts::func1': { id: 'file1.ts::func1', name: 'func1', kind: 'function', filePath: 'file1.ts', language: 'typescript', range: { start: { line: 0, character: 0 }, end: { line: 1, character: 0 } } },
                'file2.ts::class1': { id: 'file2.ts::class1', name: 'class1', kind: 'class', filePath: 'file2.ts', language: 'typescript', range: { start: { line: 0, character: 0 }, end: { line: 1, character: 0 } } }
            },
            relations: {
                'rel1': { id: 'rel1', sourceId: 'file1.ts::func1', targetId: 'file2.ts::class1', kind: 'call', certainty: 'EXTRACTED' }
            }
        };

        const tools = new GraphTools(() => mockData);
        const overview = tools.getProjectOverview();

        expect(overview.totalFiles).toBe(2);
        expect(overview.totalSymbols).toBe(2);
        expect(overview.totalRelations).toBe(1);
        expect(overview.symbolKinds['function']).toBe(1);
        expect(overview.symbolKinds['class']).toBe(1);
    });

    test('getCallees returns relations where target is called by source', () => {
        const mockData: GraphData = {
            version: '1.0',
            symbols: {
                'f1': { id: 'f1', name: 'func1', kind: 'function', filePath: 'file1.ts', language: 'typescript', range: { start: { line: 0, character: 0 }, end: { line: 1, character: 0 } } },
            },
            relations: {
                'r1': { id: 'r1', sourceId: 'f1', targetId: 'f2', kind: 'call', certainty: 'EXTRACTED' }
            }
        };

        const tools = new GraphTools(() => mockData);
        const callees = tools.getCallees('func1');
        expect(callees.length).toBe(1);
        expect(callees[0].targetId).toBe('f2');
    });

    test('getImpact returns symbols that call the target', () => {
        const mockData: GraphData = {
            version: '1.0',
            symbols: {
                'f1': { id: 'f1', name: 'func1', kind: 'function', filePath: 'file1.ts', language: 'typescript', range: { start: { line: 0, character: 0 }, end: { line: 1, character: 0 } } },
                'f2': { id: 'f2', name: 'func2', kind: 'function', filePath: 'file2.ts', language: 'typescript', range: { start: { line: 0, character: 0 }, end: { line: 1, character: 0 } } },
            },
            relations: {
                'r1': { id: 'r1', sourceId: 'f2', targetId: 'f1', kind: 'call', certainty: 'EXTRACTED' }
            }
        };

        const tools = new GraphTools(() => mockData);
        const impact = tools.getImpact('f1');
        expect(impact.length).toBe(1);
        expect(impact[0].name).toBe('func2');
    });
});

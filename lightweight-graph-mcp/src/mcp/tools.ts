import { GraphData, SymbolInfo, Relation } from '../common/types';

export class GraphTools {
    constructor(private getGraphData: () => GraphData) {}

    public searchSymbols(query: string, maxNodes: number = 30): SymbolInfo[] {
        const data = this.getGraphData();
        const results: SymbolInfo[] = [];
        const lowerQuery = query.toLowerCase();

        for (const id in data.symbols) {
            const sym = data.symbols[id];
            if (sym.name.toLowerCase().includes(lowerQuery) || id.toLowerCase().includes(lowerQuery)) {
                results.push(sym);
                if (results.length >= maxNodes) break;
            }
        }
        return results;
    }

    public getSymbolInfo(symbolName: string): SymbolInfo | null {
        const data = this.getGraphData();
        // exact match by ID or find first match by name
        if (data.symbols[symbolName]) {
            return data.symbols[symbolName];
        }

        for (const id in data.symbols) {
            if (data.symbols[id].name === symbolName) {
                return data.symbols[id];
            }
        }
        return null;
    }

    public getDependencies(target: string): Relation[] {
        const data = this.getGraphData();
        const results: Relation[] = [];
        const targetSym = this.getSymbolInfo(target);
        if (!targetSym) return results;

        for (const id in data.relations) {
            const rel = data.relations[id];
            if (rel.sourceId === targetSym.id || rel.sourceId === targetSym.filePath) {
                results.push(rel);
            }
        }
        return results;
    }

    public getCallers(target: string): Relation[] {
        const data = this.getGraphData();
        const results: Relation[] = [];

        for (const id in data.relations) {
            const rel = data.relations[id];
            if (rel.kind === 'call' && (rel.targetId === target || rel.targetId.endsWith(`::${target}`))) {
                results.push(rel);
            }
        }
        return results;
    }

    public getCallees(target: string): Relation[] {
        const data = this.getGraphData();
        const results: Relation[] = [];
        const targetSym = this.getSymbolInfo(target);
        if (!targetSym) return results;

        for (const id in data.relations) {
            const rel = data.relations[id];
            if (rel.kind === 'call' && rel.sourceId === targetSym.id) {
                results.push(rel);
            }
        }
        return results;
    }

    public getImpact(target: string): SymbolInfo[] {
        // Find callers, and classes that inherit from it
        const callers = this.getCallers(target);
        const data = this.getGraphData();
        const impact: SymbolInfo[] = [];

        for (const rel of callers) {
            if (data.symbols[rel.sourceId]) {
                impact.push(data.symbols[rel.sourceId]);
            }
        }
        // Very simplified impact analysis
        return impact;
    }

    public getProjectOverview(): any {
        const data = this.getGraphData();
        const stats = {
            totalFiles: new Set(Object.values(data.symbols).map(s => s.filePath)).size,
            totalSymbols: Object.keys(data.symbols).length,
            totalRelations: Object.keys(data.relations).length,
            symbolKinds: {} as Record<string, number>
        };

        for (const id in data.symbols) {
            const kind = data.symbols[id].kind;
            stats.symbolKinds[kind] = (stats.symbolKinds[kind] || 0) + 1;
        }

        return stats;
    }
}

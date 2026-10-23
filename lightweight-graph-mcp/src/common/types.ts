export type Language = 'javascript' | 'typescript' | 'python';

export interface Position {
    line: number;
    character: number;
}

export interface Range {
    start: Position;
    end: Position;
}

export type SymbolKind = 'class' | 'function' | 'method' | 'module' | 'interface' | 'variable';
export type RelationKind = 'import' | 'call' | 'inherit' | 'implement' | 'reference';
export type RelationCertainty = 'EXTRACTED' | 'RESOLVED' | 'INFERRED' | 'UNRESOLVED';

export interface SymbolInfo {
    id: string; // Unique ID (e.g. filepath::symbolname)
    name: string;
    kind: SymbolKind;
    filePath: string;
    range: Range;
    language: Language;
    documentation?: string;
}

export interface Relation {
    id: string;
    sourceId: string;
    targetId: string;
    kind: RelationKind;
    certainty: RelationCertainty;
    range?: Range; // Where the relationship is declared in the source code
}

export interface GraphData {
    version: string;
    symbols: Record<string, SymbolInfo>;
    relations: Record<string, Relation>;
}

export interface McpQueryOptions {
    maxDepth?: number;
    maxNodes?: number;
    maxResultChars?: number;
}

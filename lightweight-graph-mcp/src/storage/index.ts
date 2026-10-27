import * as fs from 'fs';
import { GraphData } from '../common/types';
import { CodeParser } from '../core/parser';
import { SymbolExtractor } from '../core/symbols';
import { RelationExtractor } from '../core/relations';
import { GraphCache } from './cache';
import { SymbolInfo } from '../common/types';

export class GraphIndex {
    private data: GraphData;
    private cache: GraphCache;
    private parser = new CodeParser();
    private symbolExtractor = new SymbolExtractor();
    private relationExtractor = new RelationExtractor();
    private extensionPath?: string;

    constructor(workspaceRoot: string, extensionPath?: string) {
        this.cache = new GraphCache(workspaceRoot);
        this.data = { version: '1.0', symbols: {}, relations: {} };
        this.extensionPath = extensionPath;
    }

    public async initialize(): Promise<void> {
        await this.parser.initialize(this.extensionPath);
        const loaded = await this.cache.load();
        if (loaded) {
            this.data = loaded;
        }
    }

    public async updateFile(filePath: string, skipSave: boolean = false): Promise<void> {
        const language = CodeParser.getLanguageFromFile(filePath);
        if (!language) return;

        // Remove old entries before parsing to avoid leaving old data if parsing fails
        this.removeFileEntries(filePath);

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const tree = this.parser.parse(content, language);

            if (tree) {
                // Extract new entries
                const symbols = this.symbolExtractor.extractSymbols(tree, filePath, language);
                const relations = this.relationExtractor.extractRelations(tree, filePath, language);

                // Add to index
                for (const sym of symbols) {
                    this.data.symbols[sym.id] = sym;
                }
                for (const rel of relations) {
                    this.data.relations[rel.id] = rel;
                }

                this.resolveImports();
                this.resolveRelations();
                if (!skipSave) {
                    await this.cache.save(this.data);
                }
            }
        } catch (error) {
            console.error(`Failed to index file ${filePath}:`, error);
        }
    }

    public async saveCache(): Promise<void> {
        await this.cache.save(this.data);
    }

    public async removeFile(filePath: string): Promise<void> {
        this.removeFileEntries(filePath);
        await this.cache.save(this.data);
    }

    private removeFileEntries(filePath: string) {
        for (const id in this.data.symbols) {
            if (this.data.symbols[id].filePath === filePath) {
                delete this.data.symbols[id];
            }
        }
        for (const id in this.data.relations) {
            const rel = this.data.relations[id];
            if (rel.sourceId.startsWith(filePath) || rel.id.startsWith(filePath) || rel.targetId === filePath || rel.targetId.startsWith(`${filePath}::`)) {
                delete this.data.relations[id];
            }
        }
    }

    public resolveImports() {
        // Collect known file paths from symbols
        const knownFiles = new Set<string>();
        for (const symId in this.data.symbols) {
            knownFiles.add(this.data.symbols[symId].filePath);
        }

        const exts = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts', '.py'];

        for (const id in this.data.relations) {
            const rel = this.data.relations[id];
            if (rel.kind === 'import' && !knownFiles.has(rel.targetId)) {
                // targetId doesn't exactly match a known file path. Try appending extensions or index
                let resolvedTargetId: string | null = null;

                for (const ext of exts) {
                    if (knownFiles.has(rel.targetId + ext)) {
                        resolvedTargetId = rel.targetId + ext;
                        break;
                    }
                    if (knownFiles.has(rel.targetId + '/index' + ext)) {
                        resolvedTargetId = rel.targetId + '/index' + ext;
                        break;
                    }
                }

                if (resolvedTargetId) {
                    rel.targetId = resolvedTargetId;
                    rel.certainty = 'RESOLVED';

                    // Update ID to match the resolved targetId (assuming format: source::import::target)
                    const oldId = rel.id;
                    const newId = `${rel.sourceId}::import::${resolvedTargetId}`;
                    if (oldId !== newId) {
                        rel.id = newId;
                        this.data.relations[newId] = rel;
                        delete this.data.relations[oldId];
                    }
                }
            }
        }
    }

    public resolveRelations() {
        // Pre-calculate a map of symbols by name to avoid O(N*M) nested loops
        const symbolsByName = new Map<string, { id: string, sym: SymbolInfo }[]>();
        for (const symId in this.data.symbols) {
            const sym = this.data.symbols[symId];
            let list = symbolsByName.get(sym.name);
            if (!list) {
                list = [];
                symbolsByName.set(sym.name, list);
            }
            list.push({ id: symId, sym });
        }

        for (const id in this.data.relations) {
            const rel = this.data.relations[id];
            if (rel.kind === 'call' && rel.targetId.startsWith('unknown::')) {
                const funcName = rel.targetId.split('::')[1];
                const sourceFilePath = rel.sourceId.split('::')[0];

                let exactMatch = null;
                let fallbackMatch = null;

                const candidates = symbolsByName.get(funcName);
                if (candidates) {
                    for (const item of candidates) {
                        if (item.sym.filePath === sourceFilePath) {
                            // Exact match in the same file
                            exactMatch = item.id;
                            break; // Highly confident it's this one
                        } else if (!fallbackMatch) {
                            // Keep the first external match as a fallback
                            fallbackMatch = item.id;
                        }
                    }
                }

                if (exactMatch) {
                    rel.targetId = exactMatch;
                    rel.certainty = 'RESOLVED';
                } else if (fallbackMatch) {
                    rel.targetId = fallbackMatch;
                    rel.certainty = 'INFERRED';
                }
            }
        }
    }

    public getGraphData(): GraphData {
        return this.data;
    }

    public async clear(): Promise<void> {
        this.data = { version: '1.0', symbols: {}, relations: {} };
        await this.cache.clear();
    }
}

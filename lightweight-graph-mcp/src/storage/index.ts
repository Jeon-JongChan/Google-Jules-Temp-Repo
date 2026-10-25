import * as fs from 'fs';
import { GraphData } from '../common/types';
import { CodeParser } from '../core/parser';
import { SymbolExtractor } from '../core/symbols';
import { RelationExtractor } from '../core/relations';
import { GraphCache } from './cache';

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

    public resolveRelations() {
        for (const id in this.data.relations) {
            const rel = this.data.relations[id];
            if (rel.kind === 'call' && rel.targetId.startsWith('unknown::')) {
                const funcName = rel.targetId.split('::')[1];
                let resolvedTargetId = null;

                // Try to find the matching symbol in the same file first
                const sourceFilePath = rel.sourceId.split('::')[0];
                let exactMatch = null;
                for (const symId in this.data.symbols) {
                    if (this.data.symbols[symId].name === funcName) {
                        if (this.data.symbols[symId].filePath === sourceFilePath) {
                            exactMatch = symId;
                            break;
                        } else if (!resolvedTargetId) {
                            resolvedTargetId = symId;
                        }
                    }
                }

                if (exactMatch) {
                    resolvedTargetId = exactMatch;
                }

                if (resolvedTargetId) {
                    rel.targetId = resolvedTargetId;
                    rel.certainty = 'RESOLVED';
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

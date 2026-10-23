import * as fs from 'fs';
import { GraphData, SymbolInfo, Relation, Language } from '../common/types';
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

    public async updateFile(filePath: string): Promise<void> {
        const language = CodeParser.getLanguageFromFile(filePath);
        if (!language) return;

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const tree = this.parser.parse(content, language);

            if (tree) {
                // Remove old entries for this file
                this.removeFileEntries(filePath);

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

                await this.cache.save(this.data);
            }
        } catch (error) {
            console.error(`Failed to index file ${filePath}:`, error);
        }
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
            if (this.data.relations[id].sourceId.startsWith(filePath) || this.data.relations[id].id.startsWith(filePath)) {
                delete this.data.relations[id];
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

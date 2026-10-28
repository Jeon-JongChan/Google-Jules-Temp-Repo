import * as fs from 'fs';
import { GraphData } from '../common/types';
import { CodeParser } from '../core/parser';
import { SymbolExtractor } from '../core/symbols';
import { RelationExtractor } from '../core/relations';
import { GraphCache } from './cache';
import languages from '../common/languages.json';
import * as path from 'path';

/** AST에서 추출한 프로젝트 심볼과 관계를 관리한다. */
export class GraphIndex {
    private data: GraphData;
    private cache: GraphCache;
    private parser = new CodeParser();
    private symbolExtractor = new SymbolExtractor();
    private relationExtractor = new RelationExtractor();
    private extensionPath?: string;
    private parseErrorFiles = new Set<string>();

    /** 프로젝트 캐시와 파서의 자산 경로를 설정한다. */
    constructor(workspaceRoot: string, extensionPath?: string) {
        this.cache = new GraphCache(workspaceRoot);
        this.data = { version: '1.0', symbols: {}, relations: {} };
        this.extensionPath = extensionPath;
    }

    /** 파서를 준비하고 필요할 때 기존 스냅샷을 읽는다. */
    public async initialize(loadCache = true): Promise<void> {
        await this.parser.initialize(this.extensionPath);
        const loaded = loadCache ? await this.cache.load() : null;
        if (loaded) {
            this.data = loaded;
        }
    }

    /** 파일을 파싱한 뒤 기존 항목을 교체하며 실패는 호출자에게 전달한다. */
    public async updateFile(filePath: string, skipSave: boolean = false): Promise<void> {
        const language = CodeParser.getLanguageFromFile(filePath);
        if (!language) return;

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            let tree = this.parser.parse(content, language);
            // .h는 C와 C++가 공유하므로 C 문법에서 오류가 날 때 C++도 확인한다.
            if (tree?.rootNode.hasError && path.extname(filePath) === '.h') {
                const cppTree = this.parser.parse(content, 'cpp');
                if (cppTree && !cppTree.rootNode.hasError) {
                    tree.delete();
                    tree = cppTree;
                } else { cppTree?.delete(); }
            }
            if (tree?.rootNode.hasError) this.parseErrorFiles.add(filePath);

            if (tree) {
                try {
                    // 혼합 Objective-C++는 두 문법에서 인식한 선언과 관계를 합친다.
                    const symbols = this.symbolExtractor.extractSymbols(tree, filePath, language);
                    const relations = this.relationExtractor.extractRelations(tree, filePath, language);
                    if (language === 'objcpp') {
                        const cppTree = this.parser.parse(content, 'cpp');
                        if (cppTree) {
                            try {
                                symbols.push(...this.symbolExtractor.extractSymbols(cppTree, filePath, language));
                                relations.push(...this.relationExtractor.extractRelations(cppTree, filePath, language));
                            } finally { cppTree.delete(); }
                        }
                    }
                    this.removeFileEntries(filePath);

                    // 키가 같은 중복 선언은 하나로 합친다.
                    for (const sym of symbols) {
                        this.data.symbols[sym.id] = sym;
                    }
                    for (const rel of relations) {
                        this.data.relations[rel.id] = rel;
                    }

                    if (!skipSave) {
                        this.resolveImports();
                        this.resolveRelations();
                        await this.cache.save(this.data);
                    }
                } finally {
                    tree.delete();
                }
            } else {
                throw new Error(`지원 언어 파일을 파싱하지 못했습니다: ${filePath}`);
            }
        } catch (error) {
            throw new Error(`파일 색인 실패: ${filePath}`, { cause: error });
        }
    }

    /** 완성된 스냅샷을 저장한다. */
    public async saveCache(): Promise<void> {
        await this.cache.save(this.data);
    }

    /** 파일의 심볼과 관계를 제거한 스냅샷을 저장한다. */
    public async removeFile(filePath: string): Promise<void> {
        this.removeFileEntries(filePath);
        await this.cache.save(this.data);
    }

    /** 메모리에서 특정 파일에 속한 항목을 제거한다. */
    private removeFileEntries(filePath: string) {
        for (const id in this.data.symbols) {
            if (this.data.symbols[id].filePath === filePath) {
                delete this.data.symbols[id];
            }
        }
        for (const id in this.data.relations) {
            const rel = this.data.relations[id];
            // 대상 파일을 갱신할 때 다른 파일이 선언한 임포트·호출까지 지우면 안 된다.
            if (rel.sourceId === filePath || rel.sourceId.startsWith(`${filePath}::`) || rel.id.startsWith(`${filePath}::`)) {
                delete this.data.relations[id];
            }
        }
    }

    /** 상대 임포트 경로를 이미 색인된 파일에 연결한다. */
    public resolveImports() {
        // 파일 경로는 지원 언어의 모든 심볼에서 수집한다.
        const knownFiles = new Set<string>();
        for (const symId in this.data.symbols) {
            knownFiles.add(this.data.symbols[symId].filePath);
        }

        const exts = Object.values(languages).flatMap(config => config.extensions);

        for (const id in this.data.relations) {
            const rel = this.data.relations[id];
            if (rel.kind === 'import' && !knownFiles.has(rel.targetId)) {
                // 확장자를 생략한 상대 경로와 index 파일을 확인한다.
                let resolvedTargetId: string | null = null;

                for (const ext of exts) {
                    if (knownFiles.has(rel.targetId + ext)) {
                        resolvedTargetId = rel.targetId + ext;
                        break;
                    }
                    if (knownFiles.has(path.join(rel.targetId, 'index' + ext))) {
                        resolvedTargetId = path.join(rel.targetId, 'index' + ext);
                        break;
                    }
                }

                if (resolvedTargetId) {
                    rel.targetId = resolvedTargetId;
                    rel.certainty = 'RESOLVED';

                    // 해석된 경로와 관계 ID를 일치시킨다.
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

    /** 같은 언어의 유일한 후보만 연결하고 모호한 대상은 미해결로 남긴다. */
    public resolveRelations() {
        for (const id in this.data.relations) {
            const rel = this.data.relations[id];
            if (['call', 'inherit', 'implement'].includes(rel.kind) && rel.targetId.startsWith('unknown::')) {
                const funcName = rel.targetId.split('::')[1];
                const sourceFilePath = rel.sourceId.split('::')[0];
                const sourceLanguage = CodeParser.getLanguageFromFile(sourceFilePath);
                const matches = Object.values(this.data.symbols).filter(symbol => symbol.name === funcName &&
                    symbol.language === sourceLanguage);
                const local = matches.filter(symbol => symbol.filePath === sourceFilePath);
                if (local.length === 1) {
                    rel.targetId = local[0].id;
                    rel.certainty = 'RESOLVED';
                } else if (!local.length && matches.length === 1) {
                    rel.targetId = matches[0].id;
                    rel.certainty = 'INFERRED';
                } else {
                    rel.certainty = 'UNRESOLVED';
                }
            }
        }
    }

    /** 현재 메모리의 그래프를 반환한다. */
    public getGraphData(): GraphData {
        return this.data;
    }

    /** 문법 오류 또는 미지원 방언 구문이 있었던 파일을 반환한다. */
    public getParseErrorFiles(): string[] {
        return [...this.parseErrorFiles];
    }

    /** 캐시를 빈 그래프로 초기화한다. */
    public async clear(): Promise<void> {
        this.data = { version: '1.0', symbols: {}, relations: {} };
        await this.cache.clear();
    }

    /** 반복 생성 시 파서의 WASM 메모리를 해제한다. */
    public dispose(): void {
        this.parser.dispose();
    }
}

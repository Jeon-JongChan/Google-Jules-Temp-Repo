import { Language } from '../common/types';
import * as fs from 'fs';
import * as path from 'path';

// Using commonjs require to bypass TS module resolution issues with web-tree-sitter.
// web-tree-sitter exposes the Parser class as a named export; normalize so this
// works both from node_modules and from the esbuild bundle.
const webTreeSitter = require('web-tree-sitter');
const Parser = webTreeSitter.Parser ?? webTreeSitter.default ?? webTreeSitter;

export class CodeParser {
    private parser: any | null = null;
    private initialized = false;
    private langCache = new Map<Language, any>();

    constructor() {}

    public async initialize(extensionPath?: string): Promise<void> {
        if (this.initialized) return;

        await Parser.init();
        // Language is attached to Parser only after init() completes, so it
        // must be resolved here rather than at module load time.
        const Language = Parser.Language ?? webTreeSitter.Language;
        this.parser = new Parser();
        this.initialized = true;

        if (!extensionPath) {
            // Test environment fallback
            extensionPath = path.resolve(__dirname, '../../');
        }

        // Packaged layout: grammar WASM files are bundled into dist/wasm.
        // Dev layout: they live in node_modules/tree-sitter-wasms/out.
        const packagedWasmDir = path.join(extensionPath, 'dist', 'wasm');
        const devWasmDir = path.join(extensionPath, 'node_modules', 'tree-sitter-wasms', 'out');
        const wasmDir = fs.existsSync(path.join(packagedWasmDir, 'tree-sitter-javascript.wasm')) ? packagedWasmDir : devWasmDir;

        try {
            const jsWasm = path.join(wasmDir, 'tree-sitter-javascript.wasm');
            const jsLang = await Language.load(jsWasm);
            this.langCache.set('javascript', jsLang);

            const tsWasm = path.join(wasmDir, 'tree-sitter-typescript.wasm');
            const tsLang = await Language.load(tsWasm);
            this.langCache.set('typescript', tsLang);

            const pyWasm = path.join(wasmDir, 'tree-sitter-python.wasm');
            const pyLang = await Language.load(pyWasm);
            this.langCache.set('python', pyLang);
        } catch (e) {
            console.error('Failed to load WASM languages', e);
        }
    }

    public parse(content: string, language: Language): any | null {
        if (!this.parser || !this.langCache.has(language)) return null;

        try {
            const lang = this.langCache.get(language)!;
            this.parser.setLanguage(lang);
            return this.parser.parse(content);
        } catch (e) {
            console.error(`Failed to parse ${language} code:`, e);
            return null;
        }
    }

    public static getLanguageFromFile(filePath: string): Language | null {
        if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) return 'javascript';
        if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) return 'typescript';
        if (filePath.endsWith('.py')) return 'python';
        return null;
    }
}

import { Language, SymbolInfo, SymbolKind } from '../common/types';

export class SymbolExtractor {
    public extractSymbols(tree: any, filePath: string, language: Language): SymbolInfo[] {
        const symbols: SymbolInfo[] = [];
        this.traverseNode(tree.rootNode, filePath, language, symbols);
        return symbols;
    }

    private traverseNode(node: any, filePath: string, language: Language, symbols: SymbolInfo[]) {
        const symbol = this.extractNodeSymbol(node, filePath, language);
        if (symbol) {
            symbols.push(symbol);
        }

        for (let i = 0; i < node.childCount; i++) {
            const child = node.child(i);
            if (child) {
                this.traverseNode(child, filePath, language, symbols);
            }
        }
    }

    private extractNodeSymbol(node: any, filePath: string, language: Language): SymbolInfo | null {
        let name = '';
        let kind: SymbolKind | null = null;

        if (language === 'javascript' || language === 'typescript') {
            if (node.type === 'class_declaration') {
                kind = 'class';
                name = node.childForFieldName('name')?.text || '';
            } else if (node.type === 'function_declaration' || node.type === 'arrow_function') {
                kind = 'function';
                name = node.childForFieldName('name')?.text || '';
            } else if (node.type === 'method_definition') {
                kind = 'method';
                name = node.childForFieldName('name')?.text || '';
            } else if (node.type === 'interface_declaration') {
                kind = 'interface';
                name = node.childForFieldName('name')?.text || '';
            }
        } else if (language === 'python') {
            if (node.type === 'class_definition') {
                kind = 'class';
                name = node.childForFieldName('name')?.text || '';
            } else if (node.type === 'function_definition') {
                kind = 'function';
                name = node.childForFieldName('name')?.text || '';
            }
        }

        if (kind && name) {
            return {
                id: `${filePath}::${name}`,
                name,
                kind,
                filePath,
                range: {
                    start: { line: node.startPosition.row, character: node.startPosition.column },
                    end: { line: node.endPosition.row, character: node.endPosition.column }
                },
                language
            };
        }

        return null;
    }
}

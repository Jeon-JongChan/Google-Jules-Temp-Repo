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
            } else if (node.type === 'function_declaration') {
                kind = 'function';
                name = node.childForFieldName('name')?.text || '';
            } else if (node.type === 'arrow_function') {
                kind = 'function';
                // arrow function might be part of variable declarator
                if (node.parent && node.parent.type === 'variable_declarator') {
                    name = node.parent.childForFieldName('name')?.text || '';
                } else if (node.parent && node.parent.type === 'pair') { // object property
                    name = node.parent.childForFieldName('key')?.text || '';
                } else {
                    name = node.childForFieldName('name')?.text || '';
                }
            } else if (node.type === 'method_definition') {
                kind = 'method';
                name = node.childForFieldName('name')?.text || '';
            } else if (node.type === 'interface_declaration') {
                kind = 'interface';
                name = node.childForFieldName('name')?.text || '';
            } else if (node.type === 'variable_declarator') {
                // only variables, not arrow functions (handled above)
                const valueNode = node.childForFieldName('value');
                if (valueNode && valueNode.type !== 'arrow_function') {
                    kind = 'variable';
                    name = node.childForFieldName('name')?.text || '';
                }
            } else if (node.type === 'type_alias_declaration') {
                kind = 'class'; // 'type_alias' -> map to class or interface since our type is restricted. using 'interface' for TS types? let's use 'interface'
                name = node.childForFieldName('name')?.text || '';
            } else if (node.type === 'enum_declaration') {
                kind = 'class'; // 'enum' -> map to class
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
            const scope = this.getEnclosingScopeName(node, language);
            const id = scope ? `${filePath}::${scope}::${name}` : `${filePath}::${name}`;

            return {
                id,
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

    private getEnclosingScopeName(node: any, language: Language): string {
        let current = node.parent;
        const scopeParts: string[] = [];

        while (current) {
            let name = '';
            if (language === 'javascript' || language === 'typescript') {
                if (current.type === 'class_declaration' || current.type === 'interface_declaration') {
                    name = current.childForFieldName('name')?.text || '';
                } else if (current.type === 'function_declaration' || current.type === 'method_definition') {
                    name = current.childForFieldName('name')?.text || '';
                }
            } else if (language === 'python') {
                if (current.type === 'class_definition' || current.type === 'function_definition') {
                    name = current.childForFieldName('name')?.text || '';
                }
            }
            if (name) {
                scopeParts.unshift(name);
            }
            current = current.parent;
        }
        return scopeParts.join('::');
    }
}

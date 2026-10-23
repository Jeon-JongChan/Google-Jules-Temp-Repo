import { Language, Relation, RelationCertainty, RelationKind } from '../common/types';
import * as path from 'path';

export class RelationExtractor {
    public extractRelations(tree: any, filePath: string, language: Language): Relation[] {
        const relations: Relation[] = [];
        this.traverseNode(tree.rootNode, filePath, language, relations);
        return relations;
    }

    private traverseNode(node: any, filePath: string, language: Language, relations: Relation[]) {
        const relation = this.extractNodeRelation(node, filePath, language);
        if (relation) {
            relations.push(relation);
        }

        for (let i = 0; i < node.childCount; i++) {
            const child = node.child(i);
            if (child) {
                this.traverseNode(child, filePath, language, relations);
            }
        }
    }

    private extractNodeRelation(node: any, filePath: string, language: Language): Relation | null {
        if (language === 'javascript' || language === 'typescript') {
            if (node.type === 'call_expression') {
                const funcNode = node.childForFieldName('function');
                if (funcNode) {
                    const funcName = funcNode.text;
                    const callerName = this.findEnclosingSymbol(node, language);

                    return {
                        id: `${filePath}::call::${callerName}->${funcName}`,
                        sourceId: `${filePath}::${callerName}`,
                        targetId: `unknown::${funcName}`, // We might need a resolver pass to resolve "unknown"
                        kind: 'call',
                        certainty: 'EXTRACTED',
                        range: {
                            start: { line: node.startPosition.row, character: node.startPosition.column },
                            end: { line: node.endPosition.row, character: node.endPosition.column }
                        }
                    };
                }
            } else if (node.type === 'import_statement') {
                const sourceNode = node.childForFieldName('source');
                if (sourceNode) {
                    const importPath = sourceNode.text.replace(/['"]/g, '');
                    return {
                        id: `${filePath}::import::${importPath}`,
                        sourceId: filePath,
                        targetId: importPath,
                        kind: 'import',
                        certainty: 'EXTRACTED'
                    };
                }
            }
        } else if (language === 'python') {
            if (node.type === 'call') {
                const funcNode = node.childForFieldName('function');
                if (funcNode) {
                    const funcName = funcNode.text;
                    const callerName = this.findEnclosingSymbol(node, language);

                    return {
                        id: `${filePath}::call::${callerName}->${funcName}`,
                        sourceId: `${filePath}::${callerName}`,
                        targetId: `unknown::${funcName}`,
                        kind: 'call',
                        certainty: 'EXTRACTED'
                    };
                }
            } else if (node.type === 'import_statement' || node.type === 'import_from_statement') {
                const moduleNode = node.childForFieldName('module_name') || node.children.find((c: any) => c.type === 'dotted_name');
                if (moduleNode) {
                    const importPath = moduleNode.text;
                    return {
                        id: `${filePath}::import::${importPath}`,
                        sourceId: filePath,
                        targetId: importPath,
                        kind: 'import',
                        certainty: 'EXTRACTED'
                    };
                }
            }
        }

        return null;
    }

    private findEnclosingSymbol(node: any, language: Language): string {
        let current: any | null = node.parent;
        while (current) {
            if (language === 'javascript' || language === 'typescript') {
                if (current.type === 'function_declaration' || current.type === 'method_definition') {
                    return current.childForFieldName('name')?.text || 'anonymous';
                }
            } else if (language === 'python') {
                if (current.type === 'function_definition') {
                    return current.childForFieldName('name')?.text || 'anonymous';
                }
            }
            current = current.parent;
        }
        return 'global';
    }
}

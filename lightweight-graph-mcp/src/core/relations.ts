import { Language, Relation } from '../common/types';
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
                    let funcName = funcNode.text;

                    if (funcName === 'require') {
                        const argsNode = node.childForFieldName('arguments');
                        if (argsNode && argsNode.namedChildCount > 0) {
                            const argText = argsNode.namedChild(0).text.replace(/['"]/g, '');
                            const resolvedPath = this.resolveImportPath(filePath, argText, language);
                            return {
                                id: `${filePath}::import::${resolvedPath}`,
                                sourceId: filePath,
                                targetId: resolvedPath,
                                kind: 'import',
                                certainty: 'EXTRACTED'
                            };
                        }
                    }

                    // For member calls like obj.method(), let's capture the method name to help resolution later
                    if (funcNode.type === 'member_expression') {
                        const propNode = funcNode.childForFieldName('property');
                        if (propNode) {
                            funcName = propNode.text;
                        }
                    }
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
            } else if (node.type === 'import_statement' || node.type === 'export_statement') {
                const sourceNode = node.childForFieldName('source');
                if (sourceNode) {
                    const importPath = sourceNode.text.replace(/['"]/g, '');
                    const resolvedPath = this.resolveImportPath(filePath, importPath, language);
                    return {
                        id: `${filePath}::import::${resolvedPath}`,
                        sourceId: filePath,
                        targetId: resolvedPath,
                        kind: 'import',
                        certainty: 'EXTRACTED'
                    };
                }
            }
        } else if (language === 'python') {
            if (node.type === 'call') {
                const funcNode = node.childForFieldName('function');
                if (funcNode) {
                    let funcName = funcNode.text;
                    if (funcNode.type === 'attribute') {
                        const attrNode = funcNode.childForFieldName('attribute');
                        if (attrNode) {
                            funcName = attrNode.text;
                        }
                    }
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

    private resolveImportPath(currentFilePath: string, importPath: string, language: Language): string {
        if (importPath.startsWith('.')) {
            const dir = path.dirname(currentFilePath);
            let resolved = path.join(dir, importPath);
            // Optional: could append .ts, .js but usually tracking just the resolved base name is enough
            // for simple comparison if we strip extensions everywhere, but let's keep it exact if we can, or just relative
            // The issue mentions normalizing relative paths to actual paths.
            return resolved;
        }
        return importPath;
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

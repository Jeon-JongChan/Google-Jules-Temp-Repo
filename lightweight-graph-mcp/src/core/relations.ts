import { Language, Relation } from '../common/types';
import * as path from 'path';
import { nativeDeclaration, nativeScope } from './declarations';

/** AST에 명시된 호출·임포트·상속 관계를 추출한다. */
export class RelationExtractor {
    /** 파일 하나의 모든 관계를 반환한다. */
    public extractRelations(tree: any, filePath: string, language: Language): Relation[] {
        const relations: Relation[] = [];
        this.traverseNode(tree.rootNode, filePath, language, relations);
        return relations;
    }

    /** 언어별 추출기를 적용한 뒤 자식 노드를 방문한다. */
    private traverseNode(node: any, filePath: string, language: Language, relations: Relation[]) {
        if (!['javascript', 'typescript', 'tsx', 'python'].includes(language)) {
            relations.push(...this.extractNativeRelations(node, filePath, language));
        }
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

    /** Java·Go·Rust·C 계열의 관계와 출처 범위를 추출한다. */
    private extractNativeRelations(node: any, filePath: string, language: Language): Relation[] {
        const relations: Relation[] = [];
        const scope = nativeScope(node, language) || 'global';
        const range = {
            start: { line: node.startPosition.row, character: node.startPosition.column },
            end: { line: node.endPosition.row, character: node.endPosition.column }
        };
        if (['call_expression', 'method_invocation', 'invocation_expression', 'object_creation_expression'].includes(node.type)) {
            const called = node.childForFieldName('function') ?? node.childForFieldName('name') ?? node.childForFieldName('type');
            const name = (called?.childForFieldName('field') ?? called?.childForFieldName('name') ?? called)?.text?.split(/::|\.|->/).pop();
            if (name) relations.push({
                id: `${filePath}::call::${scope}->${name}@${node.startIndex}`,
                sourceId: `${filePath}::${scope}`, targetId: `unknown::${name}`,
                kind: 'call', certainty: 'EXTRACTED', range
            });
        }
        let imported = '';
        if (node.type === 'preproc_include') imported = node.childForFieldName('path')?.text ?? '';
        else if (node.type === 'import_spec') imported = node.childForFieldName('path')?.text ?? '';
        else if (node.type === 'use_declaration') imported = node.childForFieldName('argument')?.text ?? '';
        else if (node.type === 'import_declaration' && language === 'java') imported = node.text.replace(/^import\s+(?:static\s+)?|;$/g, '');
        else if (node.type === 'using_directive') imported = node.text.replace(/^using\s+|;$/g, '');
        if (imported) {
            const local = imported.startsWith('"') && ['c', 'cpp', 'objc', 'objcpp', 'cuda'].includes(language);
            imported = imported.replace(/^["<`]|[">`]$/g, '');
            if (local) imported = path.resolve(path.dirname(filePath), imported);
            relations.push({ id: `${filePath}::import::${imported}`, sourceId: filePath,
                targetId: imported, kind: 'import', certainty: 'EXTRACTED', range });
        }
        const declaration = nativeDeclaration(node, language);
        if (declaration?.kind === 'class' || declaration?.kind === 'interface') {
            const bases = [node.childForFieldName('superclass'), node.childForFieldName('interfaces'),
                node.childForFieldName('bases'), node.namedChildren.find((child: any) => child.type === 'base_class_clause')];
            for (const base of bases) {
                if (!base) continue;
                const candidates = base.type === 'identifier' ? [base] : base.namedChildren.flatMap((child: any) =>
                    child.type === 'type_list' ? child.namedChildren : [child]);
                for (const target of candidates) {
                    if (target.type === 'access_specifier') continue;
                    const kind = base.type === 'super_interfaces' ? 'implement' : 'inherit';
                    const owner = [nativeScope(node, language), declaration.name].filter(Boolean).join('::');
                    relations.push({ id: `${filePath}::${owner}::${kind}::${target.text}`,
                        sourceId: `${filePath}::${owner}`, targetId: `unknown::${target.text}`,
                        kind, certainty: 'EXTRACTED', range });
                }
            }
        }
        return relations;
    }

    /** JS/TS/Python의 기존 관계 규칙을 적용한다. */
    private extractNodeRelation(node: any, filePath: string, language: Language): Relation | null {
        if (language === 'javascript' || language === 'typescript' || language === 'tsx') {
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

    /** 상대 임포트 경로를 파일 시스템 기준으로 변환한다. */
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

    /** 심볼 추출과 동일한 중첩 범위를 호출자 ID로 사용한다. */
    private findEnclosingSymbol(node: any, language: Language): string {
        let current: any | null = node.parent;
        const scopeParts: string[] = [];

        while (current) {
            let name = '';
            if (language === 'javascript' || language === 'typescript' || language === 'tsx') {
                if (current.type === 'class_declaration' || current.type === 'interface_declaration') {
                    name = current.childForFieldName('name')?.text || '';
                } else if (current.type === 'function_declaration' || current.type === 'method_definition') {
                    name = current.childForFieldName('name')?.text || '';
                } else if (current.type === 'variable_declarator') {
                    const valueNode = current.childForFieldName('value');
                    if (valueNode && valueNode.type === 'arrow_function') {
                        name = current.childForFieldName('name')?.text || '';
                    }
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

        return scopeParts.length > 0 ? scopeParts.join('::') : 'global';
    }
}

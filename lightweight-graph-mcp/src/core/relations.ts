import { Language, Range, Relation } from '../common/types';
import * as path from 'path';
import { arrowFunctionName, declarationName, nativeDeclaration, nativeScope } from './declarations';

/** 그래프 잡음을 유발하는 언어 기본 내장 함수·객체 호출 목록이다. */
export const BUILTIN_CALL_NAMES = new Set([
    'log', 'warn', 'error', 'info', 'debug', 'trace',
    'print', 'println', 'printf', 'sprintf', 'len', 'range', 'isinstance', 'issubclass', 'getattr', 'setattr', 'hasattr', 'super', 'type', 'id', 'repr', 'str', 'int', 'float', 'bool', 'list', 'dict', 'set', 'tuple', 'enumerate', 'zip', 'map', 'filter', 'sorted', 'reversed', 'min', 'max', 'sum', 'abs', 'open',
    'require', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate',
    'String', 'Number', 'Boolean', 'Array', 'Object', 'Math', 'JSON', 'Promise', 'Error', 'TypeError', 'RangeError', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Symbol', 'BigInt', 'RegExp', 'Date', 'Buffer',
    'resolve', 'reject', 'describe', 'it', 'test', 'expect', 'beforeAll', 'afterAll', 'beforeEach', 'afterEach'
]);

/** 외부 런타임·플랫폼 전역 객체 식별자 목록이다. */
const EXTERNAL_RECEIVER_ROOTS = new Set([
    'console', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Promise', 'Reflect', 'Symbol', 'Buffer',
    'process', 'fs', 'path', 'cp', 'child_process', 'crypto', 'http', 'https', 'url', 'util', 'events', 'stream',
    'vscode', 'z', 'ts', 'assert', 'jest', 'vi', 'os', 'sys', 're', 'time', 'datetime', 'fmt', 'std'
]);

/** TypeScript 및 Python 기본 내장·유틸리티·컨테이너 타입 목록이다. */
const BUILTIN_TYPE_NAMES = new Set([
    'string', 'number', 'boolean', 'any', 'void', 'unknown', 'never', 'object', 'symbol', 'bigint',
    'Record', 'Array', 'ReadonlyArray', 'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet',
    'Partial', 'Required', 'Readonly', 'Pick', 'Omit', 'Exclude', 'Extract', 'NonNullable', 'ReturnType', 'Parameters', 'InstanceType',
    'Error', 'RegExp', 'Date', 'Buffer', 'NodeJS', 'ErrnoException',
    'str', 'int', 'float', 'bool', 'bytes', 'bytearray', 'complex', 'list', 'dict', 'set', 'tuple', 'frozenset', 'type',
    'List', 'Dict', 'Tuple', 'FrozenSet', 'Type', 'Optional', 'Union', 'Sequence', 'Iterable', 'Mapping', 'MutableMapping',
    'Iterator', 'Callable', 'Awaitable', 'Coroutine', 'Generator', 'Annotated', 'ClassVar', 'Final', 'Literal', 'TypeVar',
    'None', 'Ellipsis', 'Self', 'Any', 'Path', 'MagicMock', 'Mock', 'AsyncMock'
]);

/** 가까운 렉시컬 바인딩부터 찾으며 타입 미상 바인딩도 바깥 변수의 타입을 가린다. */
function lookupReceiverType(scope: string, rawReceiver: string | undefined, receiverTypes: Map<string, string>, isField = false): string | undefined {
    if (!rawReceiver || rawReceiver === 'this' || rawReceiver === 'member') return rawReceiver;
    if (isField) return receiverTypes.get(`${scope.split('::')[0] || 'global'}::${rawReceiver}`) || 'member';
    while (true) {
        const key = `${scope}::${rawReceiver}`;
        if (receiverTypes.has(key)) return receiverTypes.get(key);
        if (scope === 'global') break;
        scope = scope.includes('::') ? scope.slice(0, scope.lastIndexOf('::')) : 'global';
    }
    // shortcut: 타입 없는 정적 수신자는 대문자 클래스명만 허용한다. 소문자 정적 타입은 임포트 바인딩으로 보강한다.
    return /^[A-Z]/.test(rawReceiver) ? rawReceiver : 'member';
}

/** 호출 이름을 가리는 값 바인딩이 현재 또는 바깥 함수에 있는지 확인한다. */
function findLexicalBinding(scope: string, name: string, receiverTypes: Map<string, string>): string | undefined {
    while (true) {
        if (receiverTypes.has(`${scope}::${name}`)) return scope;
        if (scope === 'global') return undefined;
        scope = scope.includes('::') ? scope.slice(0, scope.lastIndexOf('::')) : 'global';
    }
}

/** AST에 명시된 호출·임포트·상속·구현·타입 참조 관계를 추출한다. */
export class RelationExtractor {
    /** 파일 하나의 모든 관계를 반환한다. */
    public extractRelations(tree: any, filePath: string, language: Language): Relation[] {
        const relations: Relation[] = [];
        const receiverTypes = new Map<string, string>();
        this.collectReceiverTypes(tree.rootNode, language, receiverTypes);
        this.traverseNode(tree.rootNode, filePath, language, relations, receiverTypes);
        return relations;
    }

    /** 클래스 필드·생성자 주입·파라미터·지역 new 할당에서 수신 변수별 실제 타입 이름을 수집한다. */
    private collectReceiverTypes(node: any, language: Language, receiverTypes: Map<string, string>) {
        if (!node) return;
        const scripting = ['javascript', 'typescript', 'tsx', 'python'].includes(language);
        const scope = scripting ? this.findEnclosingSymbol(node, language) : nativeScope(node, language) || 'global';
        const ownerClass = scope.split('::')[0] || 'global';

        if (node.type === 'namespace_import') {
            const name = node.namedChildren.find((child: any) => child.type === 'identifier')?.text;
            if (name) receiverTypes.set(`${scope}::${name}`, `namespace::${name}`);
        } else if (language === 'python' && node.type === 'import_statement') {
            for (const child of node.namedChildren) {
                const name = child.childForFieldName('alias')?.text || (child.childForFieldName('name') ?? child).text.split('.')[0];
                receiverTypes.set(`${scope}::${name}`, `namespace::${name}`);
            }
        }

        const extractCleanType = (raw?: string): string => {
            if (!raw) return '';
            const cleaned = raw.replace(/^:\s*/, '').replace(/[&*]/g, '').replace(/^(?:const|struct|class)\s+/, '').replace(/[<\[].*$/, '').split('|')[0].split(/\.|::/).pop()?.trim() || '';
            return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(cleaned) && !BUILTIN_TYPE_NAMES.has(cleaned) && !BUILTIN_CALL_NAMES.has(cleaned)
                ? cleaned
                : '';
        };

        if (language === 'javascript' || language === 'typescript' || language === 'tsx') {
            if (node.type === 'public_field_definition' || node.type === 'field_definition' || node.type === 'property_signature') {
                const fieldName = (node.childForFieldName('name') ?? node.childForFieldName('property'))?.text?.trim();
                const typeNode = node.childForFieldName('type');
                const valNode = node.childForFieldName('value');
                let resolvedType = extractCleanType(typeNode?.text);
                if (!resolvedType && valNode?.type === 'new_expression') {
                    resolvedType = extractCleanType(valNode.childForFieldName('constructor')?.text);
                }
                if (fieldName && resolvedType) {
                    receiverTypes.set(`${ownerClass}::${fieldName}`, resolvedType);
                }
            } else if (node.type === 'required_parameter' || node.type === 'optional_parameter') {
                const paramName = (node.childForFieldName('pattern') ?? node.childForFieldName('name'))?.text?.replace(/^[a-z]+\s+/, '').trim();
                const resolvedType = extractCleanType(node.childForFieldName('type')?.text);
                if (paramName) {
                    receiverTypes.set(`${scope}::${paramName}`, resolvedType || 'member');
                    if (scope.endsWith('::constructor') && node.children.some((child: any) => ['accessibility_modifier', 'readonly'].includes(child.type))) {
                        receiverTypes.set(`${ownerClass}::${paramName}`, resolvedType || 'member');
                    }
                }
            } else if (node.type === 'variable_declarator') {
                const varName = node.childForFieldName('name')?.text?.trim();
                const typeNode = node.childForFieldName('type');
                const valNode = node.childForFieldName('value');
                let resolvedType = extractCleanType(typeNode?.text);
                if (!resolvedType && valNode?.type === 'new_expression') {
                    resolvedType = extractCleanType(valNode.childForFieldName('constructor')?.text);
                }
                if (varName) {
                    receiverTypes.set(`${scope}::${varName}`, resolvedType || 'member');
                }
            } else if (node.type === 'assignment_expression') {
                const leftText = node.childForFieldName('left')?.text?.trim() || '';
                const rightNode = node.childForFieldName('right');
                if (leftText.startsWith('this.') && rightNode?.type === 'new_expression') {
                    const fieldName = leftText.slice(5).trim();
                    const resolvedType = extractCleanType(rightNode.childForFieldName('constructor')?.text);
                    if (fieldName && resolvedType) {
                        receiverTypes.set(`${ownerClass}::${fieldName}`, resolvedType);
                    }
                }
            }
        } else if (language === 'python') {
            if (node.type === 'typed_parameter' || node.type === 'typed_default_parameter') {
                const nameNode = node.childForFieldName('name') ?? node.namedChild(0);
                const typeNode = node.childForFieldName('type');
                const paramName = nameNode?.text?.trim();
                const resolvedType = extractCleanType(typeNode?.text);
                if (paramName) {
                    receiverTypes.set(`${scope}::${paramName}`, resolvedType || 'member');
                }
            } else if (node.type === 'assignment') {
                const leftText = node.childForFieldName('left')?.text?.trim() || '';
                const typeNode = node.childForFieldName('type');
                const rightNode = node.childForFieldName('right');
                let resolvedType = extractCleanType(typeNode?.text);
                if (!resolvedType && rightNode?.type === 'call') {
                    resolvedType = extractCleanType(rightNode.childForFieldName('function')?.text);
                }
                if (leftText.startsWith('self.')) {
                    const fieldName = leftText.slice(5).trim();
                    receiverTypes.set(`${ownerClass}::${fieldName}`, resolvedType || 'member');
                } else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(leftText)) {
                    receiverTypes.set(`${scope}::${leftText}`, resolvedType || 'member');
                }
            }
        }

        if (node.type === 'identifier' && ['parameters', 'formal_parameters'].includes(node.parent?.type)) {
            receiverTypes.set(`${scope}::${node.text}`, 'member');
        } else if (language === 'python' && node.type === 'default_parameter') {
            const name = node.childForFieldName('name')?.text;
            if (name) receiverTypes.set(`${scope}::${name}`, 'member');
        } else if (language === 'javascript' && node.type === 'assignment_pattern' && node.parent?.type === 'formal_parameters') {
            const name = node.childForFieldName('left')?.text;
            if (name) receiverTypes.set(`${scope}::${name}`, 'member');
        } else if (!scripting && ['formal_parameter', 'parameter', 'parameter_declaration'].includes(node.type)) {
            const name = declarationName(node.childForFieldName('name') ?? node.childForFieldName('declarator'));
            if (name) receiverTypes.set(`${scope}::${name}`, extractCleanType(node.childForFieldName('type')?.text) || 'member');
        }

        for (let i = 0; i < node.childCount; i++) {
            const child = node.child(i);
            if (child) this.collectReceiverTypes(child, language, receiverTypes);
        }
    }

    /** 언어별 추출기를 적용한 뒤 자식 노드를 방문한다. */
    private traverseNode(node: any, filePath: string, language: Language, relations: Relation[], receiverTypes: Map<string, string>) {
        if (!['javascript', 'typescript', 'tsx', 'python'].includes(language)) {
            relations.push(...this.extractNativeRelations(node, filePath, language, receiverTypes));
        } else {
            relations.push(...this.extractScriptingRelations(node, filePath, language, receiverTypes));
        }

        for (let i = 0; i < node.childCount; i++) {
            const child = node.child(i);
            if (child) {
                this.traverseNode(child, filePath, language, relations, receiverTypes);
            }
        }
    }

    /** AST 노드의 시작·끝 위치를 공통 범위로 변환한다. */
    private getNodeRange(node: any): Range {
        return {
            start: { line: node.startPosition.row, character: node.startPosition.column },
            end: { line: node.endPosition.row, character: node.endPosition.column }
        };
    }

    /** 정적 임포트에서 이름 변경·네임스페이스·원래 선언 이름을 보존한다. */
    private importBindings(node: any, language: Language): Record<string, string> {
        const bindings: Record<string, string> = Object.create(null);
        if (language === 'python') {
            const moduleNode = node.childForFieldName('module_name');
            for (const child of node.namedChildren) {
                if (child.startIndex === moduleNode?.startIndex || child.type === 'relative_import') continue;
                const original = (child.childForFieldName('name') ?? child).text;
                const local = child.childForFieldName('alias')?.text || original.split('.')[0];
                bindings[local] = node.type === 'import_statement' ? '*' : original;
            }
        } else if (node.type === 'import_statement') {
            const clause = node.namedChildren.find((child: any) => child.type === 'import_clause');
            for (const specifier of clause?.descendantsOfType('import_specifier') || []) {
                const original = specifier.childForFieldName('name')?.text;
                const local = specifier.childForFieldName('alias')?.text || original;
                if (local && original) bindings[local] = original;
            }
            const namespace = clause?.descendantsOfType('namespace_import')[0]?.namedChild(0)?.text;
            if (namespace) bindings[namespace] = '*';
        }
        return bindings;
    }

    /** Java·Go·Rust·C 계열의 관계와 출처 범위를 추출한다. */
    private extractNativeRelations(node: any, filePath: string, language: Language, receiverTypes: Map<string, string>): Relation[] {
        const relations: Relation[] = [];
        const scope = nativeScope(node, language) || 'global';
        const range = this.getNodeRange(node);
        if (['call_expression', 'method_invocation', 'invocation_expression', 'object_creation_expression'].includes(node.type)) {
            const called = node.childForFieldName('function') ?? node.childForFieldName('name') ?? node.childForFieldName('type');
            const name = (called?.childForFieldName('field') ?? called?.childForFieldName('name') ?? called)?.text?.split(/::|\.|->/).pop();
            const object = node.childForFieldName('object') ?? (['member_access_expression', 'field_expression', 'selector_expression'].includes(called?.type)
                ? called.childForFieldName('expression') ?? called.childForFieldName('argument') ?? called.childForFieldName('operand') : null);
            const receiver = object ? lookupReceiverType(scope, object.text === 'this' ? 'this' : object.text, receiverTypes) : undefined;
            if (name) {
                relations.push({
                    id: `${filePath}::call::${scope}->${name}@${node.startIndex}`,
                    sourceId: `${filePath}::${scope}`,
                    targetId: `unknown::${name}`,
                    kind: 'call',
                    certainty: 'EXTRACTED',
                    ...(receiver ? { receiver } : {}),
                    range
                });
            }
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
            relations.push({
                id: `${filePath}::import::${imported}`,
                sourceId: filePath,
                targetId: imported,
                kind: 'import',
                certainty: 'EXTRACTED',
                range
            });
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
                    const targetName = target.text.replace(/<.*>$/, '').trim();
                    const owner = [nativeScope(node, language), declaration.name].filter(Boolean).join('::');
                    relations.push({
                        id: `${filePath}::${owner}::${kind}::${targetName}`,
                        sourceId: `${filePath}::${owner}`,
                        targetId: `unknown::${targetName}`,
                        kind,
                        certainty: 'EXTRACTED',
                        range
                    });
                }
            }
        }
        return relations;
    }

    /** JS/TS/Python의 호출·생성자·임포트·상속·구현·타입 참조 관계를 추출한다. */
    private extractScriptingRelations(node: any, filePath: string, language: Language, receiverTypes: Map<string, string>): Relation[] {
        const relations: Relation[] = [];
        const range = this.getNodeRange(node);

        if (language === 'javascript' || language === 'typescript' || language === 'tsx') {
            if (node.type === 'new_expression') {
                const ctorNode = node.childForFieldName('constructor');
                if (ctorNode) {
                    const rawText = ctorNode.text.replace(/<.*>$/, '').trim();
                    const parts = rawText.split('.');
                    if (parts.length > 1 && EXTERNAL_RECEIVER_ROOTS.has(parts[0])) {
                        return relations;
                    }
                    const ctorName = parts.pop() || '';
                    if (ctorName && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(ctorName)) {
                        const callerName = this.findEnclosingSymbol(node, language);
                        relations.push({
                            id: `${filePath}::call::${callerName}->${ctorName}@${node.startIndex}`,
                            sourceId: `${filePath}::${callerName}`,
                            targetId: `unknown::${ctorName}`,
                            kind: 'call',
                            certainty: 'EXTRACTED',
                            range
                        });
                    }
                }
            } else if (node.type === 'call_expression') {
                const funcNode = node.childForFieldName('function');
                if (funcNode) {
                    let funcName = funcNode.text;
                    let receiver: string | undefined;

                    if (funcName === 'require') {
                        const argsNode = node.childForFieldName('arguments');
                        if (argsNode && argsNode.namedChildCount > 0) {
                            const argText = argsNode.namedChild(0).text.replace(/['"`]/g, '');
                            const resolvedPath = this.resolveImportPath(filePath, argText);
                            relations.push({
                                id: `${filePath}::import::${resolvedPath}`,
                                sourceId: filePath,
                                targetId: resolvedPath,
                                kind: 'import',
                                certainty: 'EXTRACTED',
                                range
                            });
                            return relations;
                        }
                    }

                    const callerName = this.findEnclosingSymbol(node, language);
                    if (funcNode.type === 'member_expression') {
                        const objectNode = funcNode.childForFieldName('object');
                        const objText = objectNode?.text || '';
                        const propNode = funcNode.childForFieldName('property');
                        const rootObj = objText.split('.')[0].trim();
                        if (EXTERNAL_RECEIVER_ROOTS.has(rootObj) && !findLexicalBinding(callerName, rootObj, receiverTypes)) {
                            return relations;
                        }
                        if (propNode) {
                            funcName = propNode.text;
                        }
                        const objParts = objText.replace(/^this\./, '').split('.');
                        const lastReceiver = objParts[objParts.length - 1]?.trim();
                        const rawRec = objText === 'this' ? 'this' : (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(lastReceiver) ? lastReceiver : 'member');
                        // new Store().get()도 필드·파라미터와 동일한 생성자 타입 증거를 사용한다.
                        receiver = objectNode?.type === 'new_expression'
                            ? objectNode.childForFieldName('constructor')?.text?.replace(/<.*>$/, '').trim()
                            : lookupReceiverType(callerName, rawRec, receiverTypes, objText.startsWith('this.'));
                    }
                    // 멤버 이름만으로 내장 함수를 판별하면 사용자 정의 get/set/resolve 호출도 사라진다.
                    if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(funcName)) {
                        const shadowScope = !receiver ? findLexicalBinding(callerName, funcName, receiverTypes) : undefined;
                        relations.push({
                            id: `${filePath}::call::${callerName}->${funcName}@${node.startIndex}`,
                            sourceId: `${filePath}::${callerName}`,
                            targetId: `unknown::${funcName}`,
                            kind: 'call',
                            certainty: 'EXTRACTED',
                            ...(receiver ? { receiver } : {}),
                            ...(shadowScope ? { lexicalBinding: shadowScope === 'global' ? filePath : `${filePath}::${shadowScope}` } : {}),
                            range
                        });
                    }
                }
            } else if (node.type === 'import_statement' || node.type === 'export_statement') {
                const sourceNode = node.childForFieldName('source');
                if (sourceNode) {
                    const importPath = sourceNode.text.replace(/['"`]/g, '');
                    const resolvedPath = this.resolveImportPath(filePath, importPath);
                    relations.push({
                        id: `${filePath}::import::${resolvedPath}@${node.startIndex}`,
                        sourceId: filePath,
                        targetId: resolvedPath,
                        kind: 'import',
                        certainty: 'EXTRACTED',
                        bindings: this.importBindings(node, language),
                        bindingScope: filePath,
                        range
                    });
                }
            } else if (node.type === 'class_declaration' || node.type === 'interface_declaration') {
                const className = node.childForFieldName('name')?.text || '';
                if (className) {
                    const scope = this.findEnclosingSymbol(node, language);
                    const owner = scope !== 'global' ? `${scope}::${className}` : className;
                    for (const child of node.namedChildren || []) {
                        if (child.type === 'class_heritage') {
                            for (const clause of child.namedChildren || []) {
                                if (clause.type === 'extends_clause' || clause.type === 'implements_clause') {
                                    const kind = clause.type === 'implements_clause' ? 'implement' : 'inherit';
                                    for (const target of clause.namedChildren || []) {
                                        const targetName = target.text.replace(/<.*>$/, '').split('.').pop()?.trim();
                                        if (targetName) {
                                            relations.push({
                                                id: `${filePath}::${owner}::${kind}::${targetName}`,
                                                sourceId: `${filePath}::${owner}`,
                                                targetId: `unknown::${targetName}`,
                                                kind,
                                                certainty: 'EXTRACTED',
                                                range
                                            });
                                        }
                                    }
                                } else {
                                    const targetName = clause.text.replace(/<.*>$/, '').split('.').pop()?.trim();
                                    if (targetName) {
                                        relations.push({
                                            id: `${filePath}::${owner}::inherit::${targetName}`,
                                            sourceId: `${filePath}::${owner}`,
                                            targetId: `unknown::${targetName}`,
                                            kind: 'inherit',
                                            certainty: 'EXTRACTED',
                                            range
                                        });
                                    }
                                }
                            }
                        } else if (child.type === 'extends_type_clause' || child.type === 'extends_clause') {
                            for (const target of child.namedChildren || []) {
                                const targetName = target.text.replace(/<.*>$/, '').split('.').pop()?.trim();
                                if (targetName) {
                                    relations.push({
                                        id: `${filePath}::${owner}::inherit::${targetName}`,
                                        sourceId: `${filePath}::${owner}`,
                                        targetId: `unknown::${targetName}`,
                                        kind: 'inherit',
                                        certainty: 'EXTRACTED',
                                        range
                                    });
                                }
                            }
                        }
                    }
                }
            } else if ((language === 'typescript' || language === 'tsx') && node.type === 'type_identifier') {
                const typeName = node.text.trim();
                const parentType = node.parent?.type || '';
                if (!BUILTIN_TYPE_NAMES.has(typeName) &&
                    !['class_declaration', 'interface_declaration', 'type_alias_declaration', 'extends_clause', 'implements_clause', 'extends_type_clause', 'class_heritage'].includes(parentType)) {
                    const callerName = this.findEnclosingSymbol(node, language);
                    const callerShort = callerName.split('::').pop();
                    if (callerName !== 'global' && callerShort !== typeName) {
                        relations.push({
                            id: `${filePath}::ref::${callerName}->${typeName}`,
                            sourceId: `${filePath}::${callerName}`,
                            targetId: `unknown::${typeName}`,
                            kind: 'reference',
                            certainty: 'EXTRACTED',
                            range
                        });
                    }
                }
            }
        } else if (language === 'python') {
            if (node.type === 'call') {
                const funcNode = node.childForFieldName('function');
                if (funcNode) {
                    let funcName = funcNode.text;
                    let receiver: string | undefined;
                    const callerName = this.findEnclosingSymbol(node, language);
                    if (funcNode.type === 'attribute') {
                        const objText = funcNode.childForFieldName('object')?.text || '';
                        const attrNode = funcNode.childForFieldName('attribute');
                        const rootObj = objText.split('.')[0].trim();
                        if (EXTERNAL_RECEIVER_ROOTS.has(rootObj) && !findLexicalBinding(callerName, rootObj, receiverTypes)) {
                            return relations;
                        }
                        if (attrNode) {
                            funcName = attrNode.text;
                        }
                        const rawRec = objText === 'self' ? 'this' : objText.replace(/^self\./, '').split('.').pop()?.trim();
                        receiver = lookupReceiverType(callerName, rawRec, receiverTypes, objText.startsWith('self.'));
                    }
                    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(funcName)) {
                        const shadowScope = !receiver ? findLexicalBinding(callerName, funcName, receiverTypes) : undefined;
                        relations.push({
                            id: `${filePath}::call::${callerName}->${funcName}@${node.startIndex}`,
                            sourceId: `${filePath}::${callerName}`,
                            targetId: `unknown::${funcName}`,
                            kind: 'call',
                            certainty: 'EXTRACTED',
                            ...(receiver ? { receiver } : {}),
                            ...(shadowScope ? { lexicalBinding: shadowScope === 'global' ? filePath : `${filePath}::${shadowScope}` } : {}),
                            range
                        });
                    }
                }
            } else if (node.type === 'type') {
                const callerName = this.findEnclosingSymbol(node, language);
                if (callerName !== 'global') {
                    const tokens = node.text.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
                    const callerShort = callerName.split('::').pop();
                    for (const token of tokens) {
                        if (!BUILTIN_TYPE_NAMES.has(token) && !BUILTIN_CALL_NAMES.has(token) && token !== callerShort) {
                            relations.push({
                                id: `${filePath}::ref::${callerName}->${token}`,
                                sourceId: `${filePath}::${callerName}`,
                                targetId: `unknown::${token}`,
                                kind: 'reference',
                                certainty: 'EXTRACTED',
                                range
                            });
                        }
                    }
                }
            } else if (node.type === 'import_statement' || node.type === 'import_from_statement') {
                const moduleNode = node.childForFieldName('module_name') || node.children.find((c: any) => c.type === 'dotted_name' || c.type === 'relative_import');
                const modules = node.type === 'import_statement' ? node.namedChildren.map((child: any) => child.childForFieldName('name') ?? child) : moduleNode ? [moduleNode] : [];
                for (const importedModule of modules) {
                    const importPath = importedModule.text;
                    relations.push({
                        id: `${filePath}::import::${importPath}@${node.startIndex}`,
                        sourceId: filePath,
                        targetId: importPath,
                        kind: 'import',
                        certainty: 'EXTRACTED',
                        bindings: node.type === 'import_statement' ? {
                            [importedModule.parent?.childForFieldName('alias')?.text || importPath.split('.')[0]]: '*'
                        } : this.importBindings(node, language),
                        bindingScope: this.findEnclosingSymbol(node, language) === 'global' ? filePath : `${filePath}::${this.findEnclosingSymbol(node, language)}`,
                        range
                    });
                }
            } else if (node.type === 'class_definition') {
                const className = node.childForFieldName('name')?.text || '';
                const superclasses = node.childForFieldName('superclasses');
                if (className && superclasses) {
                    const scope = this.findEnclosingSymbol(node, language);
                    const owner = scope !== 'global' ? `${scope}::${className}` : className;
                    for (const base of superclasses.namedChildren || []) {
                        if (base.type === 'keyword_argument') continue;
                        const targetName = base.text.replace(/\[.*\]$/, '').split('.').pop()?.trim();
                        if (targetName && targetName !== 'object') {
                            relations.push({
                                id: `${filePath}::${owner}::inherit::${targetName}`,
                                sourceId: `${filePath}::${owner}`,
                                targetId: `unknown::${targetName}`,
                                kind: 'inherit',
                                certainty: 'EXTRACTED',
                                range
                            });
                        }
                    }
                }
            }
        }

        return relations;
    }

    /** 상대 임포트 경로를 파일 시스템 기준으로 변환한다. */
    private resolveImportPath(currentFilePath: string, importPath: string): string {
        if (importPath.startsWith('.')) {
            const dir = path.dirname(currentFilePath);
            return path.join(dir, importPath);
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
                } else if (current.type === 'arrow_function') {
                    name = arrowFunctionName(current);
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

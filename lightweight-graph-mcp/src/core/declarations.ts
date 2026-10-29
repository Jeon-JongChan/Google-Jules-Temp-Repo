import { Language, SymbolKind } from '../common/types';

/** 선언·호출자 추출에 동일한 화살표 함수 이름을 제공한다. */
export function arrowFunctionName(node: any): string {
    const parent = node.parent;
    if (parent?.type === 'variable_declarator') return parent.childForFieldName('name')?.text || '';
    if (parent?.type === 'pair') return parent.childForFieldName('key')?.text || '';
    if (parent?.type === 'public_field_definition' || parent?.type === 'field_definition') {
        return (parent.childForFieldName('name') ?? parent.childForFieldName('property'))?.text || '';
    }
    return node.childForFieldName('name')?.text || '';
}

/** 이름 필드가 없는 C 선언자를 따라 실제 선언 이름을 찾는다. */
export function declarationName(node: any): string {
    if (!node) return '';
    const named = node.childForFieldName('name');
    if (named) return named.text;
    const declarator = node.childForFieldName('declarator');
    if (declarator) return declarationName(declarator);
    if (node.type === 'reference_declarator') return declarationName(node.namedChildren.at(-1));
    if (['identifier', 'field_identifier', 'type_identifier', 'qualified_identifier', 'destructor_name', 'operator_name'].includes(node.type)) return node.text;
    return '';
}

/** 언어별 선언 노드를 공통 심볼 종류와 이름으로 변환한다. */
export function nativeDeclaration(node: any, language: Language): { name: string; kind: SymbolKind } | null {
    if (['javascript', 'typescript', 'tsx', 'python'].includes(language)) return null;
    const kinds: Record<string, SymbolKind> = {
        class_declaration: 'class', interface_declaration: 'interface', struct_declaration: 'class',
        record_declaration: 'class', enum_declaration: 'class', method_declaration: 'method',
        constructor_declaration: 'method', destructor_declaration: 'method', local_function_statement: 'function',
        function_declaration: 'function', function_definition: 'function', function_item: 'function',
        struct_item: 'class', enum_item: 'class', trait_item: 'interface', type_item: 'interface', mod_item: 'module',
        class_specifier: 'class', struct_specifier: 'class', union_specifier: 'class', enum_specifier: 'class',
        type_definition: 'interface', type_spec: 'class', namespace_definition: 'module', namespace_declaration: 'module',
        class_interface: 'class', class_implementation: 'class', protocol_declaration: 'interface', method_definition: 'method'
    };
    const kind = kinds[node.type];
    if (node.type === 'function_declarator' && ['declaration', 'field_declaration'].includes(node.parent?.type)) {
        const name = declarationName(node);
        return name ? { name, kind: 'function' } : null;
    }
    if (!kind) return null;
    let name = declarationName(node);
    if (['class_interface', 'class_implementation', 'protocol_declaration', 'method_definition', 'method_declaration'].includes(node.type) &&
        ['objc', 'objcpp'].includes(language)) {
        const identifiers = node.namedChildren.filter((child: any) => child.type === 'identifier');
        name = identifiers.map((child: any) => child.text).join(':');
        if (node.type.startsWith('class_') || node.type === 'protocol_declaration') name = identifiers[0]?.text ?? '';
    }
    // 오류 복구로 만들어진 임의 노드를 C 함수 정의로 오인하지 않는다.
    if (node.type === 'function_definition' && !node.childForFieldName('declarator')?.text.includes('(')) return null;
    return name ? { name, kind } : null;
}

/** 선언과 호출에 동일한 부모 범위를 적용한다. */
export function nativeScope(node: any, language: Language): string {
    const parts: string[] = [];
    if (language === 'go' && node.type === 'method_declaration') {
        const receiver = node.childForFieldName('receiver')?.namedChild(0)?.childForFieldName('type');
        if (receiver) parts.push(receiver.text.replace(/^\*/, '').replace(/\[.*\]$/, '').trim());
    }
    for (let parent = node.parent; parent; parent = parent.parent) {
        const declaration = nativeDeclaration(parent, language);
        if (declaration) {
            parts.unshift(declaration.name);
            if (language === 'go' && parent.type === 'method_declaration') {
                const receiver = parent.childForFieldName('receiver')?.namedChild(0)?.childForFieldName('type');
                if (receiver) parts.unshift(receiver.text.replace(/^\*/, '').replace(/\[.*\]$/, '').trim());
            }
        }
        else if (parent.type === 'impl_item') parts.unshift((parent.childForFieldName('type')?.text ?? 'impl').replace(/<.*>$/, '').trim());
    }
    return parts.join('::');
}

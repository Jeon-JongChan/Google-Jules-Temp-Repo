import { CodeParser } from '../src/core/parser';
import { SymbolExtractor } from '../src/core/symbols';
import { RelationExtractor } from '../src/core/relations';

describe('Graph Core Tests', () => {
    let parser: CodeParser;
    let symbolExtractor: SymbolExtractor;
    let relationExtractor: RelationExtractor;

    beforeAll(async () => {
        parser = new CodeParser();
        await parser.initialize();
        symbolExtractor = new SymbolExtractor();
        relationExtractor = new RelationExtractor();
    });

    test('extracts symbols and relations from TS code', () => {
        const code = `
            import { something } from './module';

            class MyClass {
                myMethod() {
                    console.log('test');
                    something();
                }
            }

            const myVar = () => {};
        `;
        const tree = parser.parse(code, 'typescript');
        expect(tree).toBeDefined();

        const symbols = symbolExtractor.extractSymbols(tree, 'test.ts', 'typescript');
        expect(symbols.length).toBeGreaterThan(0);

        const classSym = symbols.find(s => s.name === 'MyClass' && s.kind === 'class');
        expect(classSym).toBeDefined();

        const methodSym = symbols.find(s => s.name === 'myMethod' && s.kind === 'method');
        expect(methodSym).toBeDefined();
        // check ID collision fix (should have scope)
        expect(methodSym?.id).toContain('MyClass');

        const arrowSym = symbols.find(s => s.name === 'myVar' && s.kind === 'function');
        expect(arrowSym).toBeDefined();

        const relations = relationExtractor.extractRelations(tree, 'test.ts', 'typescript');
        expect(relations.length).toBeGreaterThan(0);

        const importRel = relations.find(r => r.kind === 'import');
        expect(importRel).toBeDefined();
        expect(importRel?.targetId).toContain('module');

        const callRel = relations.find(r => r.kind === 'call' && r.targetId.includes('something'));
        expect(callRel).toBeDefined();
    });

    test('extracts symbols from Python code', () => {
        const pyCode = `
import os

class PythonClass:
    def py_method(self):
        print('hello')
        self.other_method()

def py_func():
    pass
        `;
        const pyTree = parser.parse(pyCode, 'python');
        expect(pyTree).toBeDefined();

        const symbols = symbolExtractor.extractSymbols(pyTree, 'test.py', 'python');
        expect(symbols.length).toBeGreaterThan(0);

        const pyClass = symbols.find(s => s.name === 'PythonClass' && s.kind === 'class');
        expect(pyClass).toBeDefined();

        const pyMethod = symbols.find(s => s.name === 'py_method' && s.kind === 'function');
        expect(pyMethod).toBeDefined();
        // check python scope
        expect(pyMethod?.id).toContain('PythonClass');

        const pyFunc = symbols.find(s => s.name === 'py_func' && s.kind === 'function');
        expect(pyFunc).toBeDefined();
    });
});

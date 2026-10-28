import * as fs from 'fs';
import * as path from 'path';
import { GraphData } from '../common/types';
import { GraphCache } from './cache';

/** 내부 식별자의 프로젝트 절대 경로를 상대 경로로 바꾼다. */
function portableId(id: string, root: string): string {
    const [file, ...scope] = id.split('::');
    return [path.isAbsolute(file) ? path.relative(root, file).split(path.sep).join('/') : file, ...scope].join('::');
}

/** Graphify와 유사한 노드·링크 JSON 및 한국어 요약을 내보낸다. */
export async function writeGraphExport(root: string, data: GraphData, parseErrorCount: number) {
    const directory = path.dirname(new GraphCache(root).getCachePath());
    const nodes = new Map<string, {
        id: string; label: string; source_file: string; source_location: string; kind: string;
    }>();
    for (const symbol of Object.values(data.symbols)) {
        const id = portableId(symbol.id, root);
        nodes.set(id, {
            id,
            label: symbol.name,
            source_file: portableId(symbol.filePath, root),
            source_location: `L${symbol.range.start.line + 1}`,
            kind: symbol.kind
        });
    }
    const relationNames = { call: 'calls', import: 'imports', inherit: 'inherits', implement: 'implements', reference: 'references' };
    const links = Object.values(data.relations).map(relation => {
        const source = portableId(relation.sourceId, root);
        const target = portableId(relation.targetId, root);
        // 미해결 참조도 별도 노드로 남겨 끊긴 링크나 실제 정의와의 혼동을 막는다.
        for (const id of [source, target]) {
            if (!nodes.has(id)) {
                nodes.set(id, { id, label: id, source_file: '', source_location: '', kind: 'reference' });
            }
        }
        return {
            source,
            target,
            key: portableId(relation.id, root),
            relation: relationNames[relation.kind],
            confidence: relation.targetId.startsWith('unknown::') || relation.certainty === 'UNRESOLVED'
                ? 'AMBIGUOUS' : relation.certainty === 'EXTRACTED' ? 'EXTRACTED' : 'INFERRED',
            certainty: relation.certainty
        };
    });
    const graph = {
        directed: true,
        multigraph: true,
        graph: { producer: 'lightweight-graph-mcp', schema_version: 'lightweight-graph-mcp/1' },
        nodes: [...nodes.values()],
        links
    };
    const graphPath = path.join(directory, 'graph.json');
    const reportPath = path.join(directory, 'GRAPH_REPORT.md');
    const report = [
        '# 프로젝트 코드 그래프',
        '',
        `- 생성 시각: ${new Date().toISOString()} (UTC)`,
        `- 심볼: ${Object.keys(data.symbols).length}개`,
        `- 관계: ${links.length}개`,
        `- 확인이 필요한 관계: ${links.filter(link => link.confidence === 'AMBIGUOUS').length}개`,
        `- 구문 오류 또는 부분 지원 문법이 발견된 파일: ${parseErrorCount}개`,
        '',
        '지원 언어의 AST 스냅샷입니다. 변경 후 퀵 메뉴 또는 build_index로 갱신하세요.',
        'graph.json은 노드·링크 교환 형식이며 Graphify CLI 완전 호환을 보장하지 않습니다.',
        '문서·미디어 의미 분석, 커뮤니티 탐지, 시각화는 포함하지 않습니다.',
        'INFERRED는 이름 기반 추정이며 언어 서버 수준의 참조 해석이 아닙니다.',
        ''
    ].join('\n');
    fs.mkdirSync(directory, { recursive: true });
    for (const [file, content] of [[graphPath, JSON.stringify(graph, null, 2)], [reportPath, report]]) {
        await fs.promises.writeFile(`${file}.tmp`, content, 'utf8');
        await fs.promises.rename(`${file}.tmp`, file);
    }
    return { graphPath, reportPath };
}

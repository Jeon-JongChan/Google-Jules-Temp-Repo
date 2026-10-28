import * as fs from 'fs';
import * as path from 'path';
import { GraphIndex } from '../storage/index';
import { GraphCache } from '../storage/cache';
import { DEFAULT_EXCLUDED_FOLDERS, MAX_FILE_SIZE_BYTES } from '../common/config';
import { CodeParser } from './parser';
import { writeGraphExport } from '../storage/export';

/** 확장과 MCP가 같은 프로젝트의 캐시를 동시에 쓰지 못하게 한다. */
export async function withIndexLock<T>(root: string, action: () => Promise<T>): Promise<T> {
    if (!path.isAbsolute(root) || !fs.statSync(root).isDirectory()) {
        throw new Error('색인 대상은 존재하는 프로젝트의 절대 경로여야 합니다.');
    }
    // 산출물 디렉터리의 링크를 이용해 프로젝트 밖에 쓰는 것을 막는다.
    for (const target of [path.join(root, '.tools'), path.join(root, '.tools', '.graphify')]) {
        if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) {
            throw new Error(`산출물 경로에 심볼릭 링크를 사용할 수 없습니다: ${target}`);
        }
    }
    const directory = path.dirname(new GraphCache(root).getCachePath());
    fs.mkdirSync(directory, { recursive: true });
    const lockPath = path.join(directory, 'index.lock');
    let lock: number;
    try {
        lock = fs.openSync(lockPath, 'wx');
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
            // shortcut: 비정상 종료 후 잠금은 남는다. 자동 복구가 필요해지면 소유 프로세스 검증을 추가한다.
            throw new Error(`이미 그래프를 생성 중입니다. 비정상 종료 후라면 잠금을 확인하세요: ${lockPath}`);
        }
        throw error;
    }
    try {
        fs.writeSync(lock, String(process.pid));
        return await action();
    } finally {
        fs.closeSync(lock);
        fs.unlinkSync(lockPath);
    }
}

/** 지원 파일만 순회하여 새 스냅샷을 만들고 성공한 결과를 저장한다. */
export async function buildProjectIndex(root: string, extensionPath: string) {
    if (!path.isAbsolute(root)) throw new Error('프로젝트 절대 경로가 필요합니다.');
    root = fs.realpathSync(root);
    return withIndexLock(root, async () => {
        const index = new GraphIndex(root, extensionPath);
        await index.initialize(false);
        let filesIndexed = 0;
        let filesSkipped = 0;

        /** 심볼릭 링크를 따라 프로젝트 밖으로 나가지 않고 파일을 색인한다. */
        async function visit(directory: string): Promise<void> {
            const entries = await fs.promises.readdir(directory, { withFileTypes: true });
            for (const entry of entries) {
                const file = path.join(directory, entry.name);
                if (entry.isDirectory()) {
                    if (!DEFAULT_EXCLUDED_FOLDERS.includes(entry.name)) await visit(file);
                } else if (entry.isFile() && CodeParser.getLanguageFromFile(file)) {
                    const stat = await fs.promises.stat(file);
                    if (stat.size > MAX_FILE_SIZE_BYTES) {
                        filesSkipped++;
                        continue;
                    }
                    await index.updateFile(file, true);
                    filesIndexed++;
                    await new Promise(resolve => setImmediate(resolve));
                }
            }
        }

        try {
            await visit(root);
            // 전체 심볼이 모인 뒤 해석해야 순회 순서가 외부 호출 대상을 결정하지 않는다.
            index.resolveImports();
            index.resolveRelations();
            const data = index.getGraphData();
            const parseErrorFiles = index.getParseErrorFiles();
            const exports = await writeGraphExport(root, data, parseErrorFiles.length);
            await index.saveCache();
            return {
                workspaceRoot: root,
                cachePath: new GraphCache(root).getCachePath(),
                filesIndexed,
                filesSkipped,
                parseErrorFiles,
                symbolsCount: Object.keys(data.symbols).length,
                relationsCount: Object.keys(data.relations).length,
                ...exports
            };
        } finally {
            index.dispose();
        }
    });
}

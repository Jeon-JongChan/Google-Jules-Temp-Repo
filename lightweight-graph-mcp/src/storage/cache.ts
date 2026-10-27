import * as fs from 'fs';
import * as path from 'path';
import { GraphData } from '../common/types';

export class GraphCache {
    private cachePath: string;

    constructor(workspaceRoot: string) {
        // Store cache in a .graphify or .mcp directory in the workspace root
        this.cachePath = path.join(workspaceRoot, '.mcp', 'graph-cache.json');
    }

    public getCachePath(): string {
        return this.cachePath;
    }

    public async save(data: GraphData): Promise<void> {
        try {
            const dir = path.dirname(this.cachePath);
            await fs.promises.mkdir(dir, { recursive: true });
            // For a lightweight implementation, we just write the whole object as JSON
            // In a more robust system, we would stream or use sqlite, but memory footprint
            // is small if we only keep metadata as required.
            await fs.promises.writeFile(this.cachePath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (error) {
            console.error('Failed to save graph cache:', error);
        }
    }

    public async load(): Promise<GraphData | null> {
        try {
            const content = await fs.promises.readFile(this.cachePath, 'utf-8');
            const data = JSON.parse(content) as GraphData;
            if (data && data.version === '1.0') {
                return data;
            } else {
                console.warn('Graph cache version mismatch or invalid format. Discarding cache.');
            }
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                console.error('Failed to load graph cache:', error);
            }
        }
        return null;
    }

    public async clear(): Promise<void> {
        try {
            await fs.promises.unlink(this.cachePath);
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                console.error('Failed to clear graph cache:', error);
            }
        }
    }
}

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
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            // For a lightweight implementation, we just write the whole object as JSON
            // In a more robust system, we would stream or use sqlite, but memory footprint
            // is small if we only keep metadata as required.
            fs.writeFileSync(this.cachePath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (error) {
            console.error('Failed to save graph cache:', error);
        }
    }

    public async load(): Promise<GraphData | null> {
        try {
            if (fs.existsSync(this.cachePath)) {
                const content = fs.readFileSync(this.cachePath, 'utf-8');
                return JSON.parse(content) as GraphData;
            }
        } catch (error) {
            console.error('Failed to load graph cache:', error);
        }
        return null;
    }

    public async clear(): Promise<void> {
        try {
            if (fs.existsSync(this.cachePath)) {
                fs.unlinkSync(this.cachePath);
            }
        } catch (error) {
            console.error('Failed to clear graph cache:', error);
        }
    }
}

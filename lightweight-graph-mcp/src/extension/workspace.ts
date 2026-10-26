import * as vscode from 'vscode';
import { GraphIndex } from '../storage/index';
import * as path from 'path';
import * as fs from 'fs';
import { DEFAULT_EXCLUDED_FOLDERS, MAX_FILE_SIZE_BYTES } from '../common/config';

export class WorkspaceManager {
    private index: GraphIndex | null = null;
    private fileWatcher: vscode.FileSystemWatcher | null = null;
    private extensionPath: string;

    constructor(context: vscode.ExtensionContext, private statusBar: vscode.StatusBarItem) {
        this.extensionPath = context.extensionPath;
    }

    public async initialize() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) return;

        const root = workspaceFolders[0].uri.fsPath;
        this.index = new GraphIndex(root, this.extensionPath);
        try {
            await this.index.initialize();
            this.setupWatcher();
            this.updateStatus('Ready');

            // Trigger initial build in background if it's empty
            if (Object.keys(this.index.getGraphData().symbols).length === 0) {
                setTimeout(() => {
                    this.buildIndex();
                }, 1000);
            }

        } catch (e) {
            this.updateStatus('Error: WASM Load Failed');
            vscode.window.showErrorMessage(`Graph MCP: Failed to initialize. ${e}`);
        }
    }

    private setupWatcher() {
        this.fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.{ts,tsx,js,jsx,mjs,cjs,mts,cts,py}');

        this.fileWatcher.onDidChange(uri => this.handleFileChange(uri));
        this.fileWatcher.onDidCreate(uri => this.handleFileChange(uri));
        this.fileWatcher.onDidDelete(uri => this.handleFileDelete(uri));
    }

    private async handleFileChange(uri: vscode.Uri) {
        if (!this.index || this.shouldIgnore(uri.fsPath)) return;
        try {
            await this.index.updateFile(uri.fsPath);
        } catch (e) {
            console.error('File update failed:', e);
        }
    }

    private async handleFileDelete(uri: vscode.Uri) {
        if (!this.index) return;
        try {
            await this.index.removeFile(uri.fsPath);
        } catch (e) {
            console.error('File remove failed:', e);
        }
    }

    private shouldIgnore(filePath: string): boolean {
        const segments = filePath.split(path.sep);
        return DEFAULT_EXCLUDED_FOLDERS.some(folder => segments.includes(folder));
    }

    public async buildIndex() {
        if (!this.index) return;

        this.updateStatus('Indexing...');
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            this.updateStatus('Ready');
            return;
        }

        try {
            const validExts = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.mts', '.cts', '.py'];
            for (const folder of workspaceFolders) {
                const root = folder.uri.fsPath;
                const files = this.walkDir(root);
                for (const file of files) {
                    if (validExts.some(ext => file.endsWith(ext))) {
                        try {
                            const stat = fs.statSync(file);
                            if (stat.size <= MAX_FILE_SIZE_BYTES) {
                                await this.index.updateFile(file, true);
                            }
                        } catch (e) {
                            // ignore file stat errors
                        }
                        // Yield to event loop to avoid freezing Extension Host
                        await new Promise(resolve => setTimeout(resolve, 0));
                    }
                }
            }
            await this.index.saveCache();
            this.updateStatus('Ready');
            vscode.window.showInformationMessage('Graph MCP: Index build complete.');
        } catch (e) {
            this.updateStatus('Error');
            console.error(e);
        }
    }

    public async clearCache() {
        if (this.index) {
            await this.index.clear();
            vscode.window.showInformationMessage('Graph MCP: Cache cleared.');
        }
    }

    private walkDir(dir: string): string[] {
        let results: string[] = [];
        try {
            const list = fs.readdirSync(dir);
            list.forEach(file => {
                file = path.join(dir, file);
                if (this.shouldIgnore(file)) return;

                try {
                    const stat = fs.statSync(file);
                    if (stat && stat.isDirectory()) {
                        results = results.concat(this.walkDir(file));
                    } else {
                        results.push(file);
                    }
                } catch(e) {}
            });
        } catch (e) {
            // ignore
        }
        return results;
    }

    private updateStatus(text: string) {
        this.statusBar.text = `Graph MCP: ${text}`;
        this.statusBar.show();
    }

    public dispose() {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }
    }
}

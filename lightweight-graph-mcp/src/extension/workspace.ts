import * as vscode from 'vscode';
import { GraphIndex } from '../storage/index';
import * as path from 'path';
import * as fs from 'fs';

export class WorkspaceManager {
    private index: GraphIndex | null = null;
    private fileWatcher: vscode.FileSystemWatcher | null = null;
    private extensionPath: string;

    constructor(private context: vscode.ExtensionContext, private statusBar: vscode.StatusBarItem) {
        this.extensionPath = context.extensionPath;
    }

    public async initialize() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) return;

        const root = workspaceFolders[0].uri.fsPath;
        this.index = new GraphIndex(root, this.extensionPath);
        await this.index.initialize();

        this.setupWatcher();
        this.updateStatus('Ready');
    }

    private setupWatcher() {
        this.fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.{ts,js,py}');

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
        return filePath.includes('node_modules') ||
               filePath.includes('.git') ||
               filePath.includes('dist');
    }

    public async buildIndex() {
        if (!this.index) return;

        this.updateStatus('Indexing...');
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return;

        const root = workspaceFolders[0].uri.fsPath;

        try {
            const files = this.walkDir(root);
            for (const file of files) {
                if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.py')) {
                    await this.index.updateFile(file);
                    // Yield to event loop to avoid freezing Extension Host
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
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

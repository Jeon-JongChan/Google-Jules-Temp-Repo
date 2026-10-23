import * as vscode from 'vscode';
import * as path from 'path';

export class GraphMcpServerProvider implements vscode.McpServerDefinitionProvider {
    private readonly _onDidChangeMcpServerDefinitions = new vscode.EventEmitter<void>();
    public readonly onDidChangeMcpServerDefinitions = this._onDidChangeMcpServerDefinitions.event;

    constructor(private readonly context: vscode.ExtensionContext) {}

    public provideMcpServerDefinitions(token: vscode.CancellationToken): vscode.ProviderResult<vscode.McpServerDefinition[]> {
        const serverScriptPath = path.join(this.context.extensionPath, 'dist', 'mcp', 'server.js');
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const workspaceRoot = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : '';

        return [{
            label: "Lightweight Graph MCP",
            command: process.execPath, // Use VS Code's Node.js
            args: [serverScriptPath, workspaceRoot],
            env: { ELECTRON_RUN_AS_NODE: '1' }
        } as unknown as vscode.McpServerDefinition];
    }
}

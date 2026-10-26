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

        if (vscode.McpStdioServerDefinition) {
            return [new vscode.McpStdioServerDefinition(
                "Lightweight Graph MCP",
                process.execPath,
                [serverScriptPath, workspaceRoot],
                { ELECTRON_RUN_AS_NODE: '1' }
            )];
        } else {
            // Fallback for types if somehow running in environment where it doesn't strictly match but exists
            return [{
                label: "Lightweight Graph MCP",
                command: process.execPath, // Use VS Code's Node.js
                args: [serverScriptPath, workspaceRoot],
                env: { ELECTRON_RUN_AS_NODE: '1' }
            } as unknown as vscode.McpServerDefinition];
        }
    }
}

import * as vscode from 'vscode';
import { GraphMcpServerProvider } from './mcp-provider';
import { WorkspaceManager } from './workspace';

export function activate(context: vscode.ExtensionContext) {
    console.log('Lightweight Graph MCP extension is now active!');

    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    context.subscriptions.push(statusBar);

    const workspaceManager = new WorkspaceManager(context, statusBar);
    workspaceManager.initialize();
    context.subscriptions.push({ dispose: () => workspaceManager.dispose() });

    // Register MCP Server Provider
    const mcpProvider = new GraphMcpServerProvider(context);
    if (vscode.lm && vscode.lm.registerMcpServerDefinitionProvider) {
        const providerRegistration = vscode.lm.registerMcpServerDefinitionProvider('lightweight-graph-mcp', mcpProvider);
        context.subscriptions.push(providerRegistration);
    } else {
        vscode.window.showWarningMessage('Graph MCP: Your VS Code version does not support MCP Server Definition Provider API. Please update VS Code.');
    }

    // Register Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('graph-mcp.buildIndex', () => {
            workspaceManager.buildIndex();
        }),
        vscode.commands.registerCommand('graph-mcp.rebuildIndex', async () => {
            await workspaceManager.clearCache();
            await workspaceManager.buildIndex();
        }),
        vscode.commands.registerCommand('graph-mcp.clearCache', () => {
            workspaceManager.clearCache();
        }),
        vscode.commands.registerCommand('graph-mcp.showStatus', () => {
            statusBar.show();
            vscode.window.showInformationMessage(`Graph MCP Status: ${statusBar.text}`);
        }),
        vscode.commands.registerCommand('graph-mcp.openLogs', () => {
            vscode.window.showInformationMessage('Graph MCP: Output logs can be viewed in the VS Code Output panel under Extension Host.');
        })
    );
}

export function deactivate() {}

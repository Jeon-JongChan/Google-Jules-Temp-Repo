import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { GraphTools } from "./tools";
import * as fs from 'fs';
import { GraphCache } from '../storage/cache';

export class GraphMcpServer {
    private server: McpServer;
    private cache: GraphCache;
    private tools: GraphTools;
    private lastLoadedTime: number = 0;
    private graphData: any = { version: '1.0', symbols: {}, relations: {} };

    constructor(workspaceRoot: string) {
        this.server = new McpServer({
            name: "Lightweight Graph MCP",
            version: "1.0.0"
        });

        this.cache = new GraphCache(workspaceRoot);
        this.tools = new GraphTools(() => this.graphData);

        this.registerTools();
    }

    private async reloadIndexIfNeeded() {
        try {
            const cachePath = this.cache.getCachePath();
            if (fs.existsSync(cachePath)) {
                const stat = fs.statSync(cachePath);
                if (stat.mtimeMs > this.lastLoadedTime) {
                    const loaded = await this.cache.load();
                    if (loaded) {
                        this.graphData = loaded;
                        this.lastLoadedTime = stat.mtimeMs;
                    }
                }
            }
        } catch (e) {
            console.error('Failed to reload index:', e);
        }
    }

    private registerTools() {
        this.server.tool("search_symbols",
            "Search for functions and classes by name or pattern",
            {
                query: z.string().describe("Search query (e.g. symbol name)"),
            },
            async ({ query }) => {
                await this.reloadIndexIfNeeded();
                const results = this.tools.searchSymbols(query);
                return {
                    content: [
                        { type: "text", text: JSON.stringify(results, null, 2) }
                    ]
                };
            }
        );

        this.server.tool("get_symbol_info",
            "Get detailed information about a specific symbol",
            {
                symbol: z.string().describe("Symbol name or identifier"),
            },
            async ({ symbol }) => {
                await this.reloadIndexIfNeeded();
                const info = this.tools.getSymbolInfo(symbol);
                return {
                    content: [
                        { type: "text", text: info ? JSON.stringify(info, null, 2) : "Symbol not found" }
                    ]
                };
            }
        );

        this.server.tool("get_dependencies",
            "Get dependencies for a specific symbol or module",
            {
                target: z.string().describe("Target symbol or module name"),
            },
            async ({ target }) => {
                await this.reloadIndexIfNeeded();
                const deps = this.tools.getDependencies(target);
                return {
                    content: [
                        { type: "text", text: JSON.stringify(deps, null, 2) }
                    ]
                };
            }
        );

        this.server.tool("get_callers",
            "Find callers of a specific function",
            {
                target: z.string().describe("Target function name"),
            },
            async ({ target }) => {
                await this.reloadIndexIfNeeded();
                const callers = this.tools.getCallers(target);
                return {
                    content: [
                        { type: "text", text: JSON.stringify(callers, null, 2) }
                    ]
                };
            }
        );

        this.server.tool("get_callees",
            "Find functions called by a specific function",
            {
                target: z.string().describe("Target function name"),
            },
            async ({ target }) => {
                await this.reloadIndexIfNeeded();
                const callees = this.tools.getCallees(target);
                return {
                    content: [
                        { type: "text", text: JSON.stringify(callees, null, 2) }
                    ]
                };
            }
        );

        this.server.tool("get_impact",
            "Analyze potential impact scope when a symbol is modified",
            {
                target: z.string().describe("Target symbol name"),
            },
            async ({ target }) => {
                await this.reloadIndexIfNeeded();
                const impact = this.tools.getImpact(target);
                return {
                    content: [
                        { type: "text", text: JSON.stringify(impact, null, 2) }
                    ]
                };
            }
        );

        this.server.tool("get_project_overview",
            "Get a summary of the project structure and main modules",
            {},
            async () => {
                await this.reloadIndexIfNeeded();
                const overview = this.tools.getProjectOverview();
                return {
                    content: [
                        { type: "text", text: JSON.stringify(overview, null, 2) }
                    ]
                };
            }
        );

        this.server.tool("get_index_status",
            "Get the current index status and supported languages",
            {},
            async () => {
                await this.reloadIndexIfNeeded();
                const symbolsCount = Object.keys(this.graphData.symbols).length;
                const status = symbolsCount === 0 ? "NotBuilt" : "Ready";
                return {
                    content: [
                        { type: "text", text: JSON.stringify({
                            status,
                            symbolsCount,
                            relationsCount: Object.keys(this.graphData.relations).length,
                            supportedLanguages: ["javascript", "typescript", "python"]
                        }, null, 2) }
                    ]
                };
            }
        );
    }

    public async start() {
        await this.reloadIndexIfNeeded();
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("Lightweight Graph MCP server started");
    }
}

// Entry point for the stdio process
if (require.main === module) {
    const workspaceRoot = process.argv[2] || process.cwd();
    const server = new GraphMcpServer(workspaceRoot);

    server.start().catch(err => {
        console.error("Failed to start MCP server:", err);
        process.exit(1);
    });
}

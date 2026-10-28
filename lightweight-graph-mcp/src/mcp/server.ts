import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { GraphTools } from "./tools";
import * as path from 'path';
import { GraphCache } from '../storage/cache';
import { GraphData } from '../common/types';
import { buildProjectIndex } from '../core/build';
import languages from '../common/languages.json';

/** 고정된 프로젝트의 그래프 생성 및 조회 도구를 제공한다. */
export class GraphMcpServer {
    private server: McpServer;
    private cache: GraphCache;
    private tools: GraphTools;
    private indexBuilt = false;
    private graphData: GraphData = { version: '1.0', symbols: {}, relations: {} };

    /** stdio 프로세스를 시작한 프로젝트에 도구 접근 범위를 고정한다. */
    constructor(private readonly workspaceRoot: string) {
        this.server = new McpServer({
            name: "Lightweight Graph MCP",
            version: "1.0.1"
        });

        this.cache = new GraphCache(workspaceRoot);
        this.tools = new GraphTools(() => this.graphData);

        this.registerTools();
    }

    /** 캐시 초기화와 이전 경로도 반영하여 오래된 메모리 결과를 반환하지 않는다. */
    private async reloadIndexIfNeeded() {
        const loaded = await this.cache.load();
        this.indexBuilt = loaded !== null;
        this.graphData = loaded ?? { version: '1.0', symbols: {}, relations: {} };
    }

    /** 쓰기 도구 하나와 기존 조회 도구를 등록한다. */
    private registerTools() {
        this.server.tool('build_index',
            '현재 프로젝트의 코드 그래프를 생성·갱신합니다. 소스는 변경하지 않으며 .tools/.graphify에 저장합니다. 변경 후 또는 색인이 없을 때 호출하세요.',
            {},
            async () => {
                try {
                    const result = await buildProjectIndex(this.workspaceRoot, path.resolve(__dirname, '../..'));
                    await this.reloadIndexIfNeeded();
                    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
                } catch (error) {
                    return { isError: true, content: [{ type: 'text' as const, text: `그래프 생성 실패: ${error}` }] };
                }
            });
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
                const status = this.indexBuilt ? "Ready" : "NotBuilt";
                return {
                    content: [
                        { type: "text", text: JSON.stringify({
                            status,
                            symbolsCount,
                            relationsCount: Object.keys(this.graphData.relations).length,
                            supportedLanguages: Object.keys(languages),
                            cachePath: this.cache.getCachePath(),
                            generationMode: 'manual',
                            buildTool: 'build_index'
                        }, null, 2) }
                    ]
                };
            }
        );
    }

    /** stdout을 MCP 전용으로 유지하며 stdio 전송을 시작한다. */
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

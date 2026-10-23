const esbuild = require("esbuild");

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
    name: 'esbuild-problem-matcher',

    setup(build) {
        build.onStart(() => {
            console.log('[watch] build started');
        });
        build.onEnd((result) => {
            result.errors.forEach(({ text, location }) => {
                console.error(`✘ [ERROR] ${text}`);
                console.error(`    ${location.file}:${location.line}:${location.column}:`);
            });
            console.log('[watch] build finished');
        });
    },
};

async function main() {
    const extensionCtx = await esbuild.context({
        entryPoints: ['src/extension/extension.ts'],
        bundle: true,
        format: 'cjs',
        minify: production,
        sourcemap: !production,
        sourcesContent: false,
        platform: 'node',
        outfile: 'dist/extension/extension.js',
        external: ['vscode', 'tree-sitter', 'tree-sitter-javascript', 'tree-sitter-typescript', 'tree-sitter-python'],
        logLevel: 'silent',
        plugins: [
            esbuildProblemMatcherPlugin,
        ],
    });

    const mcpCtx = await esbuild.context({
        entryPoints: ['src/mcp/server.ts'],
        bundle: true,
        format: 'cjs',
        minify: production,
        sourcemap: !production,
        sourcesContent: false,
        platform: 'node',
        outfile: 'dist/mcp/server.js',
        external: ['vscode', 'tree-sitter', 'tree-sitter-javascript', 'tree-sitter-typescript', 'tree-sitter-python'],
        logLevel: 'silent',
        plugins: [
            esbuildProblemMatcherPlugin,
        ],
    });

    if (watch) {
        await extensionCtx.watch();
        await mcpCtx.watch();
    } else {
        await extensionCtx.rebuild();
        await mcpCtx.rebuild();
        await extensionCtx.dispose();
        await mcpCtx.dispose();
    }
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});

# Lightweight Code Graph MCP for VS Code

This extension provides a lightweight, local-first Model Context Protocol (MCP) server for VS Code that enables AI agents (like llama.vscode) to seamlessly navigate and understand your codebase's structure.

## Features

- **AST-based Parsing**: Extracts classes, functions, methods, imports, and calls using Tree-sitter.
- **Language Support**: JavaScript, TypeScript, Python.
- **Incremental Indexing**: Uses low-memory caching and updates only modified files.
- **MCP Tool Integration**: Provides tools like \`search_symbols\`, \`get_dependencies\`, and \`get_callers\` to your local LLM context.
- **Offline & Private**: Fully local operation without external servers or cloud dependencies.

## Usage

Once installed, it automatically registers its tools via MCP. You can also trigger re-indexing manually from the command palette:
- \`Graph MCP: Build Index\`
- \`Graph MCP: Rebuild Index\`
- \`Graph MCP: Clear Cache\`

## Requirements

No external dependencies like Python runtimes, Graphify CLI, or Docker required! It works out-of-the-box.

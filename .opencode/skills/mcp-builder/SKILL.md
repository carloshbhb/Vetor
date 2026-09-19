---
name: mcp-builder
description: Guide for creating MCP (Model Context Protocol) servers that enable LLMs to interact with external services. Use when building MCP servers to integrate external APIs or services.
---

# MCP Server Development Guide

Create MCP servers that enable LLMs to interact with external services through well-designed tools.

## High-Level Workflow

### Phase 1: Deep Research and Planning

1. Understand the API you're integrating
2. Study MCP protocol documentation
3. Choose TypeScript (recommended) or Python
4. Plan your tool selection

### Phase 2: Implementation

1. Set up project structure
2. Implement core infrastructure (API client, error handling)
3. Implement tools with proper schemas

### Phase 3: Review and Test

1. Code quality review
2. Build and test with MCP Inspector

### Phase 4: Create Evaluations

1. Create 10 evaluation questions
2. Test LLM effectiveness with your server

## Tool Design Principles

- Use clear, descriptive tool names
- Include concise descriptions
- Use Zod (TypeScript) or Pydantic (Python) for schemas
- Provide actionable error messages
- Support pagination where applicable

## When to Use

- Integrating external APIs for LLM use
- Building custom tool servers
- Creating MCP servers for specific services
- When user needs to connect LLMs to external data

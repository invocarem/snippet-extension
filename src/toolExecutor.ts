import { MCPToolCall, MCPToolResult } from "./mcpClient";
import { NativeToolsManager, NativeToolResult } from "./utils/nativeToolManager";
import { MCPClient } from "./mcpClient";

/**
 * Executes a tool call, dispatching to either native tools or MCP tools.
 *
 * @param toolCall - The tool call to execute (MCPToolCall interface)
 * @param options - Optional: pass MCPClient for MCP tools, or override nativeToolManager
 */
export async function toolExecutor(
  toolCall: MCPToolCall,
  options?: {
    mcpClient?: MCPClient;
    nativeToolManager?: NativeToolsManager;
    prefer?: "native" | "mcp";
  }
): Promise<MCPToolResult> {
  const { mcpClient, nativeToolManager, prefer } = options || {};
  const toolName = toolCall.name;
  const args = toolCall.arguments || {};

  // Try native tool first (default), unless prefer is set to mcp
  if (prefer !== "mcp") {
    const nativeMgr = nativeToolManager || new NativeToolsManager();
    const nativeTools = nativeMgr.getAvailableTools().map(t => t.name);
    if (nativeTools.includes(toolName)) {
      const result: NativeToolResult = await nativeMgr.callTool(toolName, args);
      return result;
    }
  }

  // Try MCP tool if available
  if (mcpClient && mcpClient.isConnected()) {
    const mcpTools = mcpClient.getAvailableTools().map(t => t.name);
    if (mcpTools.includes(toolName)) {
      const result: MCPToolResult = await mcpClient.callTool(toolName, args);
      return result;
    }
  }

  // Not found
  return {
    content: [
      {
        type: "text",
        text: `Tool '${toolName}' not found in native or MCP tools.`,
      },
    ],
    isError: true,
  };
}

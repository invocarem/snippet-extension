import * as vscode from "vscode";
import { LlamaClient } from "../api/llamaClient";
import { getNonce } from "../utils/getNonce";
import { SnippetManager } from "../utils/snippetManager";
import { toolExecutor } from "../toolExecutor";
import { ResponseParser, ParsedResponse } from "../utils/responseParser";
import type { MCPManager } from "../mcpManager";
import type { RulesManager } from "../rulesManager";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export class SnippetViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "snippet.chatView";
  private _view?: vscode.WebviewView;
  private llamaClient?: LlamaClient;
  private conversationHistory: Message[] = [];
  private snippetManager: SnippetManager;
  private mcpManager?: MCPManager;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    mcpManager?: MCPManager,
    rulesManager?: RulesManager
  ) {
    this.mcpManager = mcpManager;
    this.snippetManager = new SnippetManager({
      mcpManager,
      rulesManager,
    });
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext, // eslint-disable-line @typescript-eslint/no-unused-vars
    _token: vscode.CancellationToken // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Initialize the llama client
    this._initializeLlamaClient();

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "sendMessage":
          await this._handleUserMessage(data.message);
          break;
        case "insertCode":
          await vscode.commands.executeCommand("snippet.insertCode", data.code);
          break;
        case "clearChat":
          this.conversationHistory = [];
          break;
        case "checkConnection":
          await this._checkConnection();
          break;
      }
    });

    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("snippet.llamaServerUrl")) {
        this._initializeLlamaClient();
      }
    });
  }

  private _initializeLlamaClient() {
    const config = vscode.workspace.getConfiguration("snippet");
    const serverUrl = config.get<string>(
      "llamaServerUrl",
      "http://localhost:8080"
    );
    this.llamaClient = new LlamaClient(serverUrl);
  }

  private async _checkConnection() {
    if (!this.llamaClient) {
      this._sendMessageToWebview({
        type: "connectionStatus",
        connected: false,
        error: "Client not initialized",
      });
      return;
    }

    try {
      const connected = await this.llamaClient.healthCheck();
      this._sendMessageToWebview({
        type: "connectionStatus",
        connected,
      });
    } catch (error) {
      this._sendMessageToWebview({
        type: "connectionStatus",
        connected: false,
        error:
          error instanceof Error ? error.message : "Connection check failed",
      });
    }
  }

  private async _handleUserMessage(userMessage: string) {
    if (!this.llamaClient) {
      this._sendMessageToWebview({
        type: "error",
        message: "Llama client not initialized",
      });
      return;
    }

    // Add user message to history
    this.conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    // Show the user message in the UI
    this._sendMessageToWebview({
      type: "userMessage",
      message: userMessage,
    });

    // Start streaming assistant response
    this._sendMessageToWebview({
      type: "assistantMessageStart",
    });

    try {
      const config = vscode.workspace.getConfiguration("snippet");
      const temperature = config.get<number>("temperature", 0.7);
      const maxTokens = config.get<number>("maxTokens", 2048);

      let continueLoop = true;
      let lastToolResult: string | undefined = undefined;
      let isFirst = true;

      while (continueLoop) {
        // Build the prompt from conversation history
        const prompt = this.snippetManager.buildConversationPrompt(
          this.conversationHistory
        );

        let fullResponse = "";
        //console.log(`[PROVIDER] Starting streaming completion for prompt length: ${prompt.length}`);

        await this.llamaClient.streamComplete(
          {
            prompt,
            temperature,
            n_predict: maxTokens,
            stop: ["User:", "\nUser:", "Human:", "\nHuman:"],
          },
          (chunk: string) => {
            fullResponse += chunk;
            // Parse response during streaming for real-time display
            const parsed = ResponseParser.parse(fullResponse);
            this._sendMessageToWebview({
              type: "assistantMessageChunk",
              chunk: parsed.content,
              isFullContent: true,
            });
          }
        );

        console.log(`[PROVIDER] Streaming completed. Full response length: ${fullResponse.length}`);
        console.log(`[PROVIDER] Full response:`, fullResponse);
        
        // Parse the complete response
        const parsedResponse: ParsedResponse = ResponseParser.parse(fullResponse);
        
        // Log reasoning if present
        if (parsedResponse.reasoning) {
          console.log(`[PROVIDER] Reasoning extracted:`, parsedResponse.reasoning);
        }
        
        // Handle tool calls
        if (ResponseParser.hasToolCalls(parsedResponse)) {
          const firstToolCall = ResponseParser.getFirstToolCall(parsedResponse);
          console.log(`[PROVIDER] Tool call detected:`, firstToolCall);
          
          if (firstToolCall) {
            this._sendMessageToWebview({
              type: "assistantMessageChunk",
              chunk: `Executing tool: ${firstToolCall.name}...`,
              isFullContent: false,
            });
            try {
              const toolResult = await toolExecutor(firstToolCall, {
                mcpManager: this.mcpManager,
              });
              const toolText = toolResult.content?.map(c => c.text).join("\n") || JSON.stringify(toolResult);
              console.log(`[PROVIDER] Tool execution result:`, toolText);
              this._sendMessageToWebview({
                type: "assistantMessageChunk",
                chunk: toolText,
                isFullContent: true,
              });
              // Add tool result to conversation history as assistant message
              this.conversationHistory.push({
                role: "assistant",
                content: parsedResponse.raw,
              });
              // Add tool result as user message for next round
              this.conversationHistory.push({
                role: "user",
                content: toolText,
              });
              // Continue loop to allow next tool call
              isFirst = false;
              continue;
            } catch (err: any) {
              this._sendMessageToWebview({
                type: "assistantMessageChunk",
                chunk: `Tool execution error: ${err.message}`,
                isFullContent: true,
              });
              continueLoop = false;
              break;
            }
          }
        } else {
          // No more tool calls, finish
          this.conversationHistory.push({
            role: "assistant",
            content: parsedResponse.raw,
          });
          continueLoop = false;
        }
      }

      this._sendMessageToWebview({
        type: "assistantMessageEnd",
      });
    } catch (error: any) {
      this._sendMessageToWebview({
        type: "error",
        message: error.message,
      });
    }
  }

  // Tool call extraction is now handled by extractToolCall utility.

  public explainCode(code: string) {
    const message = this.snippetManager.buildExplanationPrompt(code);

    // Send the message to the webview
    if (this._view) {
      this._sendMessageToWebview({
        type: "setInput",
        message,
      });
    }
  }

  private _sendMessageToWebview(message: any) {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = getNonce();

    // Get URIs for CSS and JS files
    const stylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "src",
        "webview",
        "assets",
        "styles.css"
      )
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "src",
        "webview",
        "assets",
        "main.js"
      )
    );
    const formatterScriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "src",
        "webview",
        "assets",
        "markdownFormatter.js"
      )
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
    <title>Snippet AI</title>
    <link rel="stylesheet" href="${stylesUri}">
</head>
<body>
    <div id="chat-container"></div>
    <div id="input-container">
        <div class="status-indicator" id="status-indicator">Checking connection...</div>
        <textarea id="message-input" placeholder="Type your message here..." rows="3"></textarea>
        <div class="button-group">
            <button id="send-button">Send</button>
            <button id="clear-button" class="secondary-button">Clear Chat</button>
        </div>
    </div>
    <script nonce="${nonce}" src="${formatterScriptUri}"></script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

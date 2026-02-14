import * as vscode from "vscode";

import { SnippetViewProvider } from "./webview/provider";
import { registerNativeToolServer } from "./api/nativeToolServer";

export function activate(context: vscode.ExtensionContext) {
  console.log("Snippet extension is now active");

  // Register native tool server (for LLM/native tool integration)
  registerNativeToolServer(context);
  // Register the webview provider for the sidebar
  const provider = new SnippetViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("snippet.chatView", provider, {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    })
  );

  // Register commands
  const openChatCommand = vscode.commands.registerCommand(
    "snippet.openChat",
    () => {
      vscode.commands.executeCommand("snippet.chatView.focus");
    }
  );

  const insertCodeCommand = vscode.commands.registerCommand(
    "snippet.insertCode",
    async (code: string) => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        await editor.edit((editBuilder) => {
          editBuilder.insert(editor.selection.active, code);
        });
      }
    }
  );

  const explainCodeCommand = vscode.commands.registerCommand(
    "snippet.explainCode",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("No active editor");
        return;
      }

      const selection = editor.selection;
      const selectedText = editor.document.getText(selection);

      if (!selectedText) {
        vscode.window.showInformationMessage("No code selected");
        return;
      }

      // Focus the chat view and send the code for explanation
      await vscode.commands.executeCommand("snippet.chatView.focus");
      provider.explainCode(selectedText);
    }
  );

  context.subscriptions.push(
    openChatCommand,
    insertCodeCommand,
    explainCodeCommand
  );
}

export function deactivate() {}

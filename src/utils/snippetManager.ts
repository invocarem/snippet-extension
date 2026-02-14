export interface PromptTemplate {
  systemMessage: string;
  userPrefix: string;
  assistantPrefix: string;
  separator: string;
}

import { NativeToolsManager } from "./nativeToolManager";

export class SnippetManager {
  private static buildToolDocs(): string {
    const nativeToolManager = new NativeToolsManager();
    const tools = nativeToolManager.getAvailableTools();
    let doc = "You have access to the following native tools:\n";
    for (const tool of tools) {
      doc += `- ${tool.name}: ${tool.description} Args: ${JSON.stringify(tool.inputSchema.properties)}\n`;
    }
    doc += "\nTo use a tool, respond with:\n";
    doc += 'tool_call(tool_name="<tool_name>", args={...})';
    return doc;
  }

  private static readonly DEFAULT_TEMPLATE: PromptTemplate = {
    systemMessage:
      "## Current Stage: Snippet \n\nYou are a helpful AI assistant. You provide prototyping help to developers, assisting them in problem solving.\n\n"
      + SnippetManager.buildToolDocs() + "\n\n",
    userPrefix: "User:",
    assistantPrefix: "Assistant:",
    separator: "\n\n",
  };

  private currentTemplate: PromptTemplate;

  constructor(template?: Partial<PromptTemplate>) {
    this.currentTemplate = { ...SnippetManager.DEFAULT_TEMPLATE, ...template };
  }

  /**
   * Build a conversation prompt from message history
   */
  buildConversationPrompt(
    conversationHistory: Array<{
      role: "user" | "assistant" | "system";
      content: string;
    }>
  ): string {
    let prompt = this.currentTemplate.systemMessage;

    for (const msg of conversationHistory) {
      if (msg.role === "user") {
        prompt += `${this.currentTemplate.userPrefix} ${msg.content}${this.currentTemplate.separator}`;
      } else if (msg.role === "assistant") {
        prompt += `${this.currentTemplate.assistantPrefix} ${msg.content}${this.currentTemplate.separator}`;
      } else if (msg.role === "system") {
        prompt += `${msg.content}${this.currentTemplate.separator}`;
      }
    }

    prompt += `${this.currentTemplate.assistantPrefix} `;
    return prompt;
  }

  /**
   * Generate an explanation prompt for code
   */
  buildExplanationPrompt(code: string): string {
    return `Please explain this code:\n\n\`\`\`\n${code}\n\`\`\``;
  }

  /**
   * Update the prompt template
   */
  updateTemplate(template: Partial<PromptTemplate>): void {
    this.currentTemplate = { ...this.currentTemplate, ...template };
  }

  /**
   * Get the current template
   */
  getTemplate(): PromptTemplate {
    return { ...this.currentTemplate };
  }

  /**
   * Reset to default template
   */
  resetToDefault(): void {
    this.currentTemplate = { ...SnippetManager.DEFAULT_TEMPLATE };
  }
}

/**
 * Interface for the result of parsing a Harmony protocol message
 */
export interface ParsedHarmonyMessage {
  finalMessage: string;
  channels: string[];
  metadata: Record<string, any>;
}

/**
 * Class for parsing Harmony protocol messages
 * The Harmony protocol uses tags like <|start|>, <|channel|>, <|message|>, <|final|>, <|end|> to structure content
 */
export class HarmonyParser {
  /**
   * Parse a Harmony protocol string and extract the final message and metadata
   */
  static parse(input: string): ParsedHarmonyMessage {
    // Check if input contains Harmony protocol tags
    if (!input.includes("<|start|>") || !input.includes("<|end|>")) {
      // Not a Harmony message, return as-is
      return {
        finalMessage: input,
        channels: [],
        metadata: {},
      };
    }

    const channels: string[] = [];
    const metadata: Record<string, any> = {};
    let finalMessage = "";

    // Simple parser using regex to extract sections
    const tagRegex = /<\|(\w+)\|>(.*?)(?=<\|[\w]+\|>|$)/gs;
    let match;
    let currentChannel = "";
    let inFinal = false;

    while ((match = tagRegex.exec(input)) !== null) {
      const tag = match[1];
      const content = match[2].trim();

      switch (tag) {
        case "start":
          // Reset for new message
          currentChannel = "";
          inFinal = false;
          break;
        case "channel":
          currentChannel = content;
          if (!channels.includes(content)) {
            channels.push(content);
          }
          break;
        case "message":
          if (inFinal || currentChannel === "final") {
            finalMessage += content + " ";
          }
          break;
        case "final":
          inFinal = true;
          finalMessage += content + " ";
          break;
        case "assistant":
          // Ignore assistant tag for metadata
          break;
        case "end":
          // End of current message
          break;
        default:
          // Unknown tag, add to metadata
          metadata[tag] = content;
      }
    }

    // Clean up final message
    finalMessage = finalMessage.trim();

    // If no final message found, use the entire input as fallback
    if (!finalMessage) {
      finalMessage = input;
    }

    return {
      finalMessage,
      channels,
      metadata,
    };
  }
}

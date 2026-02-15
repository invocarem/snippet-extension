/**
 * Preprocesses a JSON-like string to make it safe for JSON.parse.
 * - Converts literal newlines in string values to \n
 * - Handles single quotes (optional, currently replaces with ")
 * - Removes trailing commas
 * - Leaves valid escape sequences intact
 */
function safeJsonParse(jsonStr: string): any {
  // Replace single quotes with double quotes (if needed)
  let safe = jsonStr.replace(/'/g, '"');
  // Remove trailing commas
  safe = safe.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
  // Convert literal newlines inside string values to \n
  // This regex finds string values and replaces literal newlines with \n
  safe = safe.replace(/("(?:[^"\\]|\\.)*")/gs, (match) => {
    // Only replace literal newlines inside the string value
    return match.replace(/\n/g, '\\n');
  });
  return JSON.parse(safe);
}
/**
 * Utility to robustly extract tool calls from LLM responses.
 * Supports tool_call(name="...", arguments={...}) or tool_call(tool_name="...", args={...})
 * Handles large/complex JSON arguments.
 */

export interface MCPToolCall {
  name: string;
  arguments: any;
}

/**
 * Extracts a tool call from a string, supporting large/nested JSON arguments.
 * Returns null if no valid tool call is found.
 */
export function extractToolCall(response: string): MCPToolCall | null {
  // Find the start of tool_call(
  const callStart = response.indexOf("tool_call(");
  if (callStart === -1) return null;

  // Find the opening parenthesis
  const openParen = response.indexOf("(", callStart);
  if (openParen === -1) return null;

  // Find the closing parenthesis (robust, supports nested and multiline)
  let i = openParen + 1;
  let depth = 1;
  let end = -1;
  while (i < response.length) {
    if (response[i] === "(") depth++;
    else if (response[i] === ")") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
    i++;
  }
  if (end === -1) return null;
  const inside = response.slice(openParen + 1, end);

  // Try to extract name/tool_name and arguments/args
  // Use regex to find name/tool_name, then find the JSON object for arguments/args
  const nameMatch = inside.match(/(name|tool_name)\s*=\s*"([^"]+)"/);
  if (!nameMatch) return null;
  const name = nameMatch[2];

  // Find arguments/args key
  const argsKeyMatch = inside.match(/(arguments|args)\s*=/);
  if (!argsKeyMatch) return null;
  const argsKey = argsKeyMatch[1];
  const argsKeyIdx = inside.indexOf(argsKeyMatch[0]) + argsKeyMatch[0].length;

  // Find the start of the JSON object
  let jsonStart = inside.indexOf("{", argsKeyIdx);
  if (jsonStart === -1) return null;
  // Find the end of the JSON object (brace matching, supports multiline and escaped braces)
  let braceDepth = 1;
  let j = jsonStart + 1;
  let inString = false;
  let escape = false;
  while (j < inside.length && braceDepth > 0) {
    const ch = inside[j];
    if (escape) {
      escape = false;
    } else if (ch === '\\') {
      escape = true;
    } else if (ch === '"') {
      inString = !inString;
    } else if (!inString) {
      if (ch === "{") braceDepth++;
      else if (ch === "}") braceDepth--;
    }
    j++;
  }
  if (braceDepth !== 0) return null;
  const jsonStr = inside.slice(jsonStart, j);

  // Try to parse JSON (fix single quotes, trailing commas, etc. if needed)
  try {
    const args = safeJsonParse(jsonStr);
    return { name, arguments: args };
  } catch (e) {
    return null;
  }
}

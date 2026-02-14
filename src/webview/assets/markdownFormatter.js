/**
 * Markdown formatting utilities for the webview
 */

/**
 * Parse Harmony protocol messages and extract the final message
 */
function parseHarmonyMessage(input) {
  // Check if input contains Harmony protocol tags
  if (!input.includes("<|start|>") || !input.includes("<|end|>")) {
    // Not a Harmony message, return as-is
    return {
      finalMessage: input,
      channels: [],
      metadata: {},
    };
  }

  const channels = [];
  const metadata = {};
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

/**
 * Format markdown text to HTML
 */
function formatMarkdown(text) {
  console.log("Raw input:", text);

  // First, parse Harmony protocol if present
  const parsed = parseHarmonyMessage(text);
  let html = parsed.finalMessage;

  // Extract thinking blocks BEFORE escaping HTML (use placeholders)
  const thinkingBlocks = [];
  html = html.replace(
    /<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/g,
    (match, content) => {
      const placeholder =
        "PLACEHOLDERTHINKINGBLOCK" + thinkingBlocks.length + "PLACEHOLDER";
      thinkingBlocks.push(content);
      return placeholder;
    }
  );

  // Extract code blocks BEFORE escaping HTML (use placeholders)
  const codeBlocks = [];
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, language, code) => {
    const placeholder =
      "PLACEHOLDERCODEBLOCK" + codeBlocks.length + "PLACEHOLDER";
    codeBlocks.push({ language: language.trim(), code: code.trim() });
    return placeholder;
  });

  // Escape HTML
  html = escapeHtml(html);

  // Process inline code (single backticks)
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Process bold (**text** or __text__)
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");

  // Process italic (*text* or _text_)
  html = html.replace(/(?<!\*)\*([^\*]+?)\*(?!\*)/g, "<em>$1</em>");
  html = html.replace(/(?<!_)_([^_]+?)_(?!_)/g, "<em>$1</em>");

  // Process headings
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Process unordered lists
  html = html.replace(/^[\*\-\+] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");

  // Process ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

  // Process links [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank">$1</a>'
  );

  // Process line breaks (double newline = paragraph)
  const lines = html.split("\n");
  let inBlock = false;
  let result = [];
  let paragraph = [];

  for (let line of lines) {
    if (
      line.includes('<pre class="code-block"') ||
      line.includes('<div class="code-block-container"')
    ) {
      if (paragraph.length > 0) {
        result.push("<p>" + paragraph.join("<br>") + "</p>");
        paragraph = [];
      }
      result.push(line);
      inBlock = true;
    } else if (line.includes("</pre>") || line.includes("</div>")) {
      result.push(line);
      inBlock = false;
    } else if (inBlock) {
      result.push(line);
    } else if (line.trim() === "") {
      if (paragraph.length > 0) {
        result.push("<p>" + paragraph.join("<br>") + "</p>");
        paragraph = [];
      }
    } else if (
      line.match(/^<h[123]>/) ||
      line.match(/^<ul>/) ||
      line.match(/^<\/ul>/)
    ) {
      if (paragraph.length > 0) {
        result.push("<p>" + paragraph.join("<br>") + "</p>");
        paragraph = [];
      }
      result.push(line);
    } else {
      paragraph.push(line);
    }
  }

  if (paragraph.length > 0) {
    result.push("<p>" + paragraph.join("<br>") + "</p>");
  }

  html = result.join("\n");

  // Process code block placeholders
  for (let i = 0; i < codeBlocks.length; i++) {
    const placeholder = "PLACEHOLDERCODEBLOCK" + i + "PLACEHOLDER";
    const { language, code } = codeBlocks[i];
    const lang = language.toLowerCase();
    const languageClass = lang ? "language-" + lang : "language-text";
    const languageLabel = lang
      ? '<div class="code-block-header"><span class="language-label">' +
        lang +
        '</span><button class="copy-button" data-code="' +
        escapeAttribute(code) +
        '">Copy</button></div>'
      : '<div class="code-block-header"><button class="copy-button" data-code="' +
        escapeAttribute(code) +
        '">Copy</button></div>';

    const codeBlockHtml =
      '<div class="code-block-container">' +
      languageLabel +
      '<pre class="code-block" data-language="' +
      lang +
      '"><code class="' +
      languageClass +
      '">' +
      code +
      "</code></pre></div>";
    html = html.replace(placeholder, codeBlockHtml);
  }

  // Process thinking block placeholders at the end
  for (let i = 0; i < thinkingBlocks.length; i++) {
    const placeholder = "PLACEHOLDERTHINKINGBLOCK" + i + "PLACEHOLDER";
    const content = thinkingBlocks[i].trim();
    const formattedContent = formatThinkingContent(content);
    const thinkingHtml =
      '<div class="thinking-block-container">' +
      '<div class="thinking-header" onclick="this.parentElement.classList.toggle(\'expanded\')">' +
      '<span class="thinking-icon">💭</span>' +
      '<span class="thinking-label">Reasoning</span>' +
      '<span class="thinking-toggle">▼</span>' +
      "</div>" +
      '<div class="thinking-content">' +
      formattedContent +
      "</div>" +
      "</div>";
    html = html.replace(placeholder, thinkingHtml);
  }

  console.log("Processed output:", html.substring(0, 100) + "...");
  return html;
}

/**
 * Format content inside thinking blocks
 */
function formatThinkingContent(text) {
  let html = escapeHtml(text);

  // Process inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Process bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");

  // Process italic
  html = html.replace(/(?<!\*)\*([^\*]+?)\*(?!\*)/g, "<em>$1</em>");
  html = html.replace(/(?<!_)_([^_]+?)_(?!_)/g, "<em>$1</em>");

  // Process line breaks
  html = html.replace(/\n/g, "<br>");

  return html;
}

/**
 * Process code blocks with language-specific formatting
 */
function processCodeBlocks(text) {
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;

  return text.replace(codeBlockRegex, (match, language, code) => {
    const lang = language.trim().toLowerCase();
    const trimmedCode = code.trim();

    // Check if it's JSON and format it
    if (lang === "json" || isJSON(trimmedCode)) {
      try {
        const parsed = JSON.parse(trimmedCode);
        const formatted = JSON.stringify(parsed, null, 2);
        const languageLabel =
          '<div class="code-block-header"><span class="language-label">json</span><button class="copy-button" data-code="' +
          escapeAttribute(formatted) +
          '">Copy</button></div>';
        return (
          '<div class="code-block-container">' +
          languageLabel +
          '<pre class="code-block" data-language="json"><code class="language-json">' +
          formatted +
          "</code></pre></div>"
        );
      } catch (e) {
        // If JSON parsing fails, treat as regular code
      }
    }

    const languageClass = lang ? "language-" + lang : "language-text";
    const languageLabel = lang
      ? '<div class="code-block-header"><span class="language-label">' +
        lang +
        '</span><button class="copy-button" data-code="' +
        escapeAttribute(trimmedCode) +
        '">Copy</button></div>'
      : '<div class="code-block-header"><button class="copy-button" data-code="' +
        escapeAttribute(trimmedCode) +
        '">Copy</button></div>';

    return (
      '<div class="code-block-container">' +
      languageLabel +
      '<pre class="code-block" data-language="' +
      lang +
      '"><code class="' +
      languageClass +
      '">' +
      trimmedCode +
      "</code></pre></div>"
    );
  });
}

/**
 * Utility functions
 */
function isJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttribute(text) {
  return text.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Export functions for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    formatMarkdown,
    parseHarmonyMessage,
    formatThinkingContent,
    isJSON,
    escapeHtml,
    escapeAttribute,
  };
}

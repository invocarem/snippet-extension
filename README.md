# Snippet - AI Prototyping Extension

A VS Code extension for AI-powered code prototyping using llama.cpp.

## Features

- 💬 **Chat Interface**: Interactive sidebar chat with your AI model
- 🔄 **Streaming Responses**: Real-time streaming of AI responses
- 📝 **Code Insertion**: Insert AI-generated code directly into your editor
- 🔍 **Code Explanation**: Right-click on selected code to get explanations
- ⚙️ **Configurable**: Customize server URL, temperature, and token limits
- 🎨 **Rich Formatting**: Full markdown and code block formatting support

## Rich Formatting Support

The extension now supports comprehensive formatting for LLM responses:

### Markdown Features

- **Headers**: H1, H2, H3 headings (# ## ###)
- **Text Styling**: **bold**, _italic_, `inline code`
- **Lists**: Ordered and unordered lists
- **Links**: Clickable links [text](url)
- **Paragraphs**: Proper paragraph spacing

### Code Blocks

- **Syntax Highlighting**: Language-specific code blocks with labels
- **Copy Button**: One-click copy for all code blocks
- **Insert Button**: Insert generated code directly at cursor
- **JSON Formatting**: Automatic pretty-printing of JSON code blocks
- **Multi-language Support**: JavaScript, TypeScript, Python, JSON, and more

Example code block:
\`\`\`javascript
function example() {
console.log("Code with syntax highlighting!");
}
\`\`\`

## Prerequisites

1. **llama.cpp server**: You need to have llama.cpp running with its HTTP server

   ```bash
   # Example: Running llama.cpp server
   ./server -m path/to/your/model.gguf -c 2048 --host 127.0.0.1 --port 8080
   ```

2. A compatible GGUF model file

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Compile the extension:
   ```bash
   npm run compile
   ```
4. Press F5 to open a new VS Code window with the extension loaded

## Usage

### Starting the Chat

1. Click on the Snippet icon in the Activity Bar (left sidebar)
2. Make sure your llama.cpp server is running
3. Check the connection status at the top of the chat panel
4. Type your message and press Ctrl/Cmd+Enter or click Send

### Explaining Code

1. Select code in your editor
2. Right-click and select "Snippet: Explain Selected Code"
3. The chat panel will open with the code automatically inserted

### Inserting Generated Code

When the AI generates code blocks, an "Insert at Cursor" button will appear. Click it to insert the code at your cursor position.

## Configuration

Open VS Code settings and search for "Snippet":

- **snippet.llamaServerUrl**: URL of your llama.cpp server (default: `http://localhost:8080`)
- **snippet.temperature**: Sampling temperature (0-2, default: 0.7)
- **snippet.maxTokens**: Maximum tokens to generate (default: 2048)
- **snippet.model**: Optional model name or path

## Commands

- `Snippet: Open Chat` - Open the chat sidebar
- `Snippet: Explain Selected Code` - Explain selected code
- `Snippet: Insert Code at Cursor` - Insert code at cursor position

## Development

### Project Structure

```
snippet-extension/
├── src/
│   ├── extension.ts          # Extension entry point
│   ├── api/
│   │   └── llamaClient.ts    # llama.cpp API client
│   ├── webview/
│   │   └── provider.ts       # Webview provider for chat UI
│   └── utils/
│       ├── getNonce.ts       # Security utility
│       └── llmResponseProcessor.ts  # LLM response processing and formatting
├── package.json              # Extension manifest
└── tsconfig.json            # TypeScript configuration
```

### Building

```bash
# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch
```

### Packaging

```bash
npm install -g @vscode/vsce
vsce package
```

## Troubleshooting

### "Not connected to llama.cpp"

- Ensure llama.cpp server is running
- Check the server URL in settings matches your llama.cpp server
- Verify the server is accessible (try curl http://localhost:8080/health)

### Slow responses

- Reduce `maxTokens` in settings
- Use a smaller/faster model
- Increase your hardware resources

### Extension won't activate

- Check the Output panel (View > Output) and select "Snippet" from the dropdown
- Look for error messages in the Developer Tools console (Help > Toggle Developer Tools)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

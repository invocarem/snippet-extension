# Connection Troubleshooting

## Changes Made

1. Added try-catch error handling to `_checkConnection()`
2. Reduced health check timeout from 2 minutes to 5 seconds
3. Connection status will now update within 5 seconds

## Steps to Test

1. **Reload Extension**
   - Press `F5` to start debugging, or
   - Press `Ctrl+Shift+P` → "Developer: Reload Window"

2. **Open the Snippet View**
   - Click the Snippet icon in the sidebar
   - Status should show one of:
     - "Connected to llama.cpp" (green)
     - "Not connected to llama.cpp" (red)

3. **Check Settings**
   - Press `Ctrl+,` to open Settings
   - Search for "snippet.llamaServerUrl"
   - Default: `http://localhost:8080`
   - Make sure your llama.cpp server is running on this URL

4. **Test Your Server Directly**
   ```bash
   # Test if your llama.cpp server is responding
   curl http://localhost:8080/health
   ```

## Common Issues

- **Still shows "Checking connection..."**: Means the webview message handler isn't running
  - Solution: Hard reload the window
- **Shows "Not connected"**: Server is not reachable
  - Check if llama.cpp server is running
  - Verify the URL in settings
  - Test with curl command above

- **Takes 5 seconds**: Server is slow or unreachable
  - This is expected behavior now (5s timeout)

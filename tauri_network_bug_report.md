# Critical Bug Report: Tauri App Network Requests Failing

## Summary
**Status**: 🔴 UNRESOLVED  
**Severity**: Critical - Core functionality broken  
**Environment**: Tauri 2.0 app on macOS

## Problem Description
Translation API requests work in the **web browser** (localhost:1420) but **fail completely** in the Tauri native app. The error displayed is: `"Error processing request. Please try again."`

## Observed Behavior
| Environment | Translation | TTS (GPT) | TTS (Edge) |
|-------------|------------|-----------|------------|
| Browser (localhost:1420) | ✅ Works | ✅ Works | ✅ Works |
| Tauri App (WebView) | ❌ Fails | ❌ Fails | ❌ Fails |

## Root Cause Analysis
Tauri 2.0 WebView blocks direct `fetch()` API calls for security reasons. Network requests from the frontend require the `tauri-plugin-http` plugin.

## What Has Been Attempted

### 1. Installed tauri-plugin-http
```bash
cd src-tauri && cargo add tauri-plugin-http
npm install @tauri-apps/plugin-http
```

### 2. Registered plugin in lib.rs (line 13)
```rust
.plugin(tauri_plugin_http::init())
```

### 3. Updated capabilities/default.json
```json
{
  "permissions": [
    "core:default",
    "opener:default", 
    "websocket:default",
    "window-state:default",
    "http:default"
  ],
  "remote": {
    "urls": [
      "https://generativelanguage.googleapis.com/*",
      "https://api.openai.com/*"
    ]
  }
}
```

### 4. Created safeFetch utility (src/utils/http.ts)
```typescript
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

const isTauri = () => !!(window as any).__TAURI__;

export const safeFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (isTauri()) {
        console.log('[Network] Using Tauri Native Fetch');
        return tauriFetch(input, init);
    } else {
        console.log('[Network] Using Browser Standard Fetch');
        return fetch(input, init);
    }
};
```

## Still Failing - Possible Issues to Investigate

1. **Plugin not loading correctly** - Check if `window.__TAURI__` is defined in the Tauri app
2. **Permissions not regenerating** - May need to delete `src-tauri/gen` folder and rebuild
3. **Scope restrictions** - The `remote.urls` whitelist may not be working as expected
4. **Plugin version mismatch** - Tauri 2.9.x with plugin-http 2.5.x

## Key Files to Check

| File | Purpose |
|------|---------|
| `src-tauri/src/lib.rs` | Plugin registration |
| `src-tauri/capabilities/default.json` | Permissions & URL whitelist |
| `src-tauri/Cargo.toml` | Rust dependencies |
| `src/utils/http.ts` | Fetch wrapper that switches between browser/Tauri |
| `src/services/GeminiProvider.ts` | Uses safeFetch for API calls |
| `src/services/OpenAIProvider.ts` | Uses safeFetch for API calls |

## Debugging Steps for Next Model

1. **Open DevTools in Tauri app** (Cmd+Opt+I) and check Console for:
   - `[Network] Using Tauri Native Fetch` vs `[Network] Using Browser Standard Fetch`
   - Any CORS or network errors
   - Whether `window.__TAURI__` is defined

2. **Try regenerating Tauri schema**:
   ```bash
   rm -rf src-tauri/gen
   cd src-tauri && cargo build
   ```

3. **Check if http plugin is included in Cargo.toml**:
   ```toml
   tauri-plugin-http = "2"
   ```

4. **Alternative approach - use Tauri command for HTTP**:
   Instead of frontend fetch, create a Rust command to make HTTP requests

## API Configuration

- **Gemini Models**: `gemini-3-flash-preview`, `gemini-3-pro-preview`
- **OpenAI Models**: `gpt-5.2`, `gpt-5-mini`
- **API Keys**: Stored in Tauri Store (`secure.store`) with localStorage fallback for web builds

## Other Issues Fixed During This Session

1. ✅ Settings panel created with API keys and model selection
2. ✅ Footer labels changed to "Gemini3" and "GPT"
3. ✅ Model/Voice selections now persist to localStorage
4. ✅ Window size adjusted to 1000x700 with min 800x500
5. ✅ Removed outdated gpt-4o-2024-11-20 model option
6. ❌ Edge TTS not working in Tauri (known WebView limitation)
7. ❌ **Main translation API calls failing in Tauri app**

## Command to Run
```bash
source ~/.cargo/env && npm run tauri dev
```

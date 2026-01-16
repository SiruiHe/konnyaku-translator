# Konnyaku Translator

A desktop translator with a dictionary-style mode, streaming output, and built-in TTS. It aims to feel fast and clean while still giving you depth when you need it.

The name comes from Doraemon's "翻译魔芋" (Japanese: hon'yaku konnyaku).

## Features

- Translation mode + dictionary mode (auto switch for phrases)
- Streaming output for GPT and Gemini
- TTS with Edge voices and GPT voice (Nova)
- Library with pinning and drag-reorder
- Global shortcut + Dock/Status Bar visibility options

## Run locally

For most users, download the latest release from [GitHub Releases](https://github.com/SiruiHe/konnyaku-translator/releases) instead of building locally.
Tested on macOS (Apple Silicon). Windows builds are provided but not tested.

```bash
npm install
npm run tauri dev
```

## API keys

Add keys in Settings. They are stored locally (Tauri Store) and are not sent anywhere except the provider you select.

## Credits

UI inspiration: [Next AI Translator](https://github.com/nextai-translator/nextai-translator). The implementation here is original.

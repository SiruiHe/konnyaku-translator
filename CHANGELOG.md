# Changelog

## v0.1.3

- Restore native Cmd/Ctrl copy/paste behavior in the input editor
- Highlight paste feedback for keyboard and button pastes
- Add tray menu actions (show, hide, quit) and close-to-tray behavior

## v0.1.2

- Fix clipboard shortcuts (copy/paste/cut/select-all) in the input editor
- Make status bar icon more visible on macOS
- Avoid macOS dock toggle conflicts by skipping taskbar calls

## v0.1.1

- Fix model selection to match UI, add gpt-4.1-mini, remove gpt-5.2-chat-latest
- Move GPT TTS to gpt-4o-mini-tts (Nova)
- Apply reasoning effort only to GPT-5 models to avoid invalid params
- Add DevTools toggle and tighten macOS menu/close/Dock behavior
- Trim release bundles to dmg + app (auto-updater) + nsis

## v0.1.0

- Translation + dictionary modes with streaming output
- Edge and GPT TTS, language mapping, and per-language voice selection
- Library with pin, drag-reorder, and batch manage
- App settings for Dock/Status Bar visibility and global shortcut
- Local key storage via Tauri Store

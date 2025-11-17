# Hotkey Plugin Documentation

## Overview

The Hotkey plugin allows you to simulate keyboard shortcuts across Windows, macOS, and Linux.

## Supported Keys

### Regular Keys
- Letters: `a-z` (case insensitive)
- Numbers: `0-9`
- Special characters: As typed

### Special Keys
- `enter`, `return` - Enter/Return key
- `tab` - Tab key
- `space` - Space bar
- `backspace`, `delete` - Delete keys
- `escape`, `esc` - Escape key
- `up`, `down`, `left`, `right` - Arrow keys
- `home`, `end` - Home/End keys
- `pageup`, `pagedown` - Page Up/Down
- `insert` - Insert key
- `f1` through `f12` - Function keys

## Modifiers

Different names for compatibility across platforms:

- **Ctrl**: `ctrl`, `control`
- **Alt**: `alt`, `option` (Mac)
- **Shift**: `shift`
- **Windows/Super/Command**: `win`, `super`, `meta`, `cmd`, `command`

## Platform-Specific Behavior

### Windows
- Uses PowerShell `SendKeys` API
- **Requirements**: None (built-in)
- **Limitations**: 
  - Windows key (Win/Meta) combinations have limited support
  - Some special key combinations may not work

### macOS
- Uses AppleScript `System Events` with key codes
- **Requirements**: 
  - Accessibility permissions for the terminal/app running LibreDeck
  - System Preferences → Security & Privacy → Privacy → Accessibility
- **Notes**: Use `cmd` or `command` modifier for Command key

### Linux
- Uses `xdotool` (X11) or `ydotool` (Wayland) for key simulation
- **Requirements**: 
  - **X11**: Install `xdotool` (`sudo apt install xdotool` or `sudo pacman -S xdotool`)
  - **Wayland**: Install `ydotool` (`sudo apt install ydotool`)
- **Notes**: Use `super` or `meta` for Super/Windows key

## Examples

### Copy (Ctrl+C)
```json
{
  "keys": "c",
  "modifiers": ["ctrl"]
}
```

### Paste (Ctrl+V / Cmd+V)
```json
{
  "keys": "v",
  "modifiers": ["ctrl"]  // Use "cmd" on macOS
}
```

### Switch Window (Alt+Tab)
```json
{
  "keys": "tab",
  "modifiers": ["alt"]
}
```

### Screenshot (Windows+Shift+S on Windows)
```json
{
  "keys": "s",
  "modifiers": ["win", "shift"]
}
```

### Refresh Browser (F5)
```json
{
  "keys": "f5",
  "modifiers": []
}
```

### Save (Ctrl+S)
```json
{
  "keys": "s",
  "modifiers": ["ctrl"]
}
```

### New Tab (Ctrl+T)
```json
{
  "keys": "t",
  "modifiers": ["ctrl"]
}
```

### Close Window (Alt+F4)
```json
{
  "keys": "f4",
  "modifiers": ["alt"]
}
```

## Cross-Platform Considerations

For cross-platform compatibility, consider creating platform-specific profiles or using conditional logic based on the OS.

**Example**: Copy shortcut that works on both Mac and Windows
- Windows: `Ctrl+C` → `{ keys: "c", modifiers: ["ctrl"] }`
- macOS: `Cmd+C` → `{ keys: "c", modifiers: ["cmd"] }`

## Troubleshooting

### Windows
- If hotkeys don't work, try running LibreDeck as administrator
- Some applications may block simulated keyboard input

### macOS
- Grant Accessibility permissions to the terminal/app running LibreDeck
- System Preferences → Security & Privacy → Privacy → Accessibility → Add your terminal app

### Linux (X11)
```bash
# Install xdotool
sudo apt install xdotool        # Debian/Ubuntu
sudo pacman -S xdotool          # Arch Linux
sudo dnf install xdotool        # Fedora
```

### Linux (Wayland)
```bash
# Install ydotool
sudo apt install ydotool        # Debian/Ubuntu
sudo pacman -S ydotool          # Arch Linux

# Start ydotool daemon
sudo systemctl enable --now ydotoold
```

## Known Limitations

1. **Windows**: Windows key combinations have limited support
2. **macOS**: Requires accessibility permissions
3. **Linux**: Requires xdotool (X11) or ydotool (Wayland) to be installed
4. **All platforms**: Some applications may ignore or block simulated keyboard input for security reasons

## Security Notes

- Hotkey simulation has full keyboard control
- Be careful when creating hotkeys that could cause unintended actions
- Test hotkeys in safe environments first
- Some secure applications (password managers, system settings) may block simulated input

# Local Password Manager Extension

A Firefox extension that connects your local password manager to the browser, providing secure password management with auto-fill capabilities.

## Features

- 🔐 **Secure Local Storage**: All passwords are stored locally using your existing local password manager
- 🚀 **Auto-fill**: Automatically fill login forms with stored credentials
- 🔍 **Search & Manage**: Search and manage your passwords through a clean browser interface
- ⌨️ **Keyboard Shortcuts**: Use Ctrl+Shift+L to quickly auto-fill credentials
- 🎨 **Modern UI**: Clean, modern interface that matches your browser's design
- 🔒 **Privacy First**: No cloud storage, no data collection - everything stays on your machine

## Prerequisites

Before installing the extension, you need:

1. **Local Password Manager CLI**: The [local-password-manager](https://github.com/Lucasldab/local-password-manager) CLI tool
2. **Python 3**: For running the bridge server
3. **Firefox**: Version 57.0 or later

## Installation

### Step 1: Install Local Password Manager

First, install the local password manager CLI:

```bash
git clone https://github.com/Lucasldab/local-password-manager.git
cd local-password-manager
cargo build --release
```

Make sure the binary is in your PATH or note its location.

### Step 2: Start the Bridge Server

The bridge server allows the extension to communicate with your local password manager CLI:

```bash
cd server
./start_server.sh --cli-path /path/to/local-password-manager
```

Or manually with Python:

```bash
python3 server/bridge.py --cli-path /path/to/local-password-manager
```

The server will start on `localhost:8080` by default.

### Step 3: Install the Extension

1. Open Firefox and go to `about:debugging`
2. Click "This Firefox" in the sidebar
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from this extension directory

The extension will be installed and a setup page will open automatically.

### Step 4: Configure the Extension

1. Follow the setup wizard to configure your database path and master password
2. Initialize your password vault
3. Start using the extension!

## Usage

### Basic Operations

- **Click the extension icon** to open the password manager interface
- **Search for credentials** by service name (e.g., "github.com")
- **Add new credentials** through the extension interface
- **Copy credentials** to clipboard with one click

### Auto-fill

- **Keyboard shortcut**: Press `Ctrl+Shift+L` on any login page
- **Visual indicators**: Look for the 🔐 icon next to password fields
- **Auto-fill button**: Click the "Auto-fill" button that appears on login forms

### Managing Passwords

1. **Add New Credential**:
   - Click the extension icon
   - Click "Add New Credential"
   - Fill in service, username, password, and optional notes
   - Click "Save Credential"

2. **Search Credentials**:
   - Enter a service name in the search box
   - Click "Search" or press Enter
   - View and copy credentials

3. **List All Services**:
   - Click "List All Services" to see all stored services
   - Click "View Credentials" to see details for any service

## Configuration

### Bridge Server Options

The bridge server supports several configuration options:

```bash
./start_server.sh --help
```

Options:
- `--host HOST`: Host to bind to (default: localhost)
- `--port PORT`: Port to bind to (default: 8080)
- `--cli-path PATH`: Path to local password manager CLI

### Extension Settings

The extension stores settings locally in Firefox:
- Database path
- Connection status
- User preferences

## Security

- **Local Storage**: All passwords are stored locally on your machine
- **Encryption**: Uses the same encryption as your local password manager
- **No Cloud**: No data is ever sent to external servers
- **Master Password**: Your master password is required for all operations

## Troubleshooting

### Common Issues

1. **"Command not found" error**:
   - Make sure the local password manager CLI is installed and in your PATH
   - Check the `--cli-path` parameter in the bridge server

2. **"Connection failed" error**:
   - Ensure the bridge server is running on localhost:8080
   - Check firewall settings
   - Verify Python 3 is installed

3. **"Vault not initialized" error**:
   - Run the setup wizard again
   - Check that the database path is correct and writable

4. **Auto-fill not working**:
   - Make sure you're on a login page with username and password fields
   - Try the keyboard shortcut `Ctrl+Shift+L`
   - Check that credentials exist for the current domain

### Debug Mode

To enable debug logging:

1. Open Firefox Developer Tools
2. Go to the Console tab
3. Look for messages from the extension

## Development

### Project Structure

```
local-password-manager-extension/
├── manifest.json          # Extension manifest
├── background.js          # Background script
├── popup.html             # Extension popup interface
├── popup.css              # Popup styles
├── popup.js               # Popup functionality
├── content.js             # Content script for web pages
├── setup.html             # Initial setup page
├── server/                # Bridge server
│   ├── bridge.py          # Python bridge server
│   ├── start_server.sh    # Server startup script
│   └── requirements.txt   # Python dependencies
└── icons/                 # Extension icons
    ├── icon-48.png
    └── icon-96.png
```

### Building from Source

1. Clone this repository
2. Install the local password manager CLI
3. Start the bridge server
4. Load the extension in Firefox

### Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Local Password Manager](https://github.com/Lucasldab/local-password-manager) - The underlying password manager CLI
- Firefox WebExtensions API - For browser integration
- The open source community - For inspiration and tools

## Support

If you encounter issues or have questions:

1. Check the troubleshooting section above
2. Review the [Local Password Manager documentation](https://github.com/Lucasldab/local-password-manager)
3. Open an issue on GitHub
4. Check the Firefox WebExtensions documentation

---

**Note**: This extension requires the local password manager CLI to be installed and running. Make sure to follow the installation steps carefully.

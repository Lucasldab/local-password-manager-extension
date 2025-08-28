#!/bin/bash

# Installation script for Local Password Manager Extension

set -e

echo "🔐 Local Password Manager Extension Installer"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    print_error "This installer is designed for Linux systems"
    exit 1
fi

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    print_warning "Running as root is not recommended for security reasons"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check prerequisites
print_status "Checking prerequisites..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is required but not installed"
    echo "Please install Python 3 and try again"
    exit 1
fi
print_success "Python 3 found"

# Check if git is installed
if ! command -v git &> /dev/null; then
    print_error "Git is required but not installed"
    echo "Please install git and try again"
    exit 1
fi
print_success "Git found"

# Check if cargo is installed (for building local-password-manager)
if ! command -v cargo &> /dev/null; then
    print_warning "Cargo (Rust package manager) not found"
    echo "You'll need to install Rust to build the local password manager"
    echo "Visit https://rustup.rs/ for installation instructions"
    read -p "Continue without Rust? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    print_success "Cargo found"
fi

# Check if Firefox is installed
if ! command -v firefox &> /dev/null; then
    print_warning "Firefox not found in PATH"
    echo "Make sure Firefox is installed and accessible"
else
    print_success "Firefox found"
fi

echo ""

# Install local password manager
print_status "Installing local password manager..."

LOCAL_PM_DIR="$HOME/.local/share/local-password-manager"
LOCAL_PM_BIN="$HOME/.local/bin/local-password-manager"

if [[ -f "$LOCAL_PM_BIN" ]]; then
    print_success "Local password manager already installed"
else
    if command -v cargo &> /dev/null; then
        print_status "Cloning and building local password manager..."
        mkdir -p "$LOCAL_PM_DIR"
        cd "$LOCAL_PM_DIR"
        
        if [[ ! -d "local-password-manager" ]]; then
            git clone https://github.com/Lucasldab/local-password-manager.git
        fi
        
        cd local-password-manager
        cargo build --release
        
        # Create symlink in ~/.local/bin
        mkdir -p "$HOME/.local/bin"
        ln -sf "$LOCAL_PM_DIR/local-password-manager/target/release/local-password-manager" "$LOCAL_PM_BIN"
        
        print_success "Local password manager installed to $LOCAL_PM_BIN"
    else
        print_warning "Skipping local password manager installation (Rust not available)"
        echo "You'll need to install it manually later"
    fi
fi

# Add ~/.local/bin to PATH if not already there
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    print_status "Adding ~/.local/bin to PATH..."
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
    export PATH="$HOME/.local/bin:$PATH"
    print_success "PATH updated (restart your terminal or run 'source ~/.bashrc')"
fi

echo ""

# Make server script executable
print_status "Setting up bridge server..."
chmod +x server/start_server.sh
print_success "Bridge server script made executable"

# Create systemd user service (optional)
print_status "Creating systemd user service for auto-start..."

SERVICE_DIR="$HOME/.config/systemd/user"
SERVICE_FILE="$SERVICE_DIR/local-password-manager-bridge.service"

if command -v systemctl &> /dev/null; then
    mkdir -p "$SERVICE_DIR"
    
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Local Password Manager Bridge Server
After=network.target

[Service]
Type=simple
ExecStart=$PWD/server/start_server.sh
WorkingDirectory=$PWD/server
Restart=always
RestartSec=5
Environment=PATH=$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=default.target
EOF

    print_success "Systemd service created at $SERVICE_FILE"
    echo "To enable auto-start, run: systemctl --user enable local-password-manager-bridge"
    echo "To start the service, run: systemctl --user start local-password-manager-bridge"
else
    print_warning "Systemd not available, skipping service creation"
fi

echo ""

# Installation summary
print_success "Installation completed!"
echo ""
echo "Next steps:"
echo "1. Start the bridge server:"
echo "   cd server && ./start_server.sh"
echo ""
echo "2. Install the extension in Firefox:"
echo "   - Open Firefox and go to about:debugging"
echo "   - Click 'This Firefox' in the sidebar"
echo "   - Click 'Load Temporary Add-on'"
echo "   - Select the manifest.json file from this directory"
echo ""
echo "3. Follow the setup wizard in the extension"
echo ""
echo "For more information, see the README.md file"
echo ""
print_status "Happy password managing! 🔐"

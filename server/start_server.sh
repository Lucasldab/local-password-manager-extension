#!/bin/bash

# Start script for Local Password Manager Bridge Server

# Default values
HOST="localhost"
PORT="8080"
CLI_PATH="local-password-manager"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --host)
            HOST="$2"
            shift 2
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        --cli-path)
            CLI_PATH="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --host HOST       Host to bind to (default: localhost)"
            echo "  --port PORT       Port to bind to (default: 8080)"
            echo "  --cli-path PATH   Path to local password manager CLI (default: local-password-manager)"
            echo "  --help            Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required but not installed"
    exit 1
fi

# Check if the CLI path exists
if ! command -v "$CLI_PATH" &> /dev/null; then
    echo "Warning: CLI command '$CLI_PATH' not found in PATH"
    echo "Make sure the local password manager is installed and accessible"
fi

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Start the server
echo "Starting Local Password Manager Bridge Server..."
echo "Host: $HOST"
echo "Port: $PORT"
echo "CLI Path: $CLI_PATH"
echo "Press Ctrl+C to stop the server"
echo ""

cd "$SCRIPT_DIR"
python3 bridge.py --host "$HOST" --port "$PORT" --cli-path "$CLI_PATH"

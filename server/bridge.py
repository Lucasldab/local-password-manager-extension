#!/usr/bin/env python3
"""
Bridge server for Local Password Manager Extension
Provides a REST API to communicate with the local password manager CLI
"""

import json
import subprocess
import sys
import os
import tempfile
import threading
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PasswordManagerBridge:
    def __init__(self, cli_path="local-password-manager"):
        self.cli_path = cli_path
        self.temp_files = {}
        self.lock = threading.Lock()
    
    def execute_command(self, args, input_data=None, db_path=None):
        """Execute a local password manager command"""
        try:
            # Build the command
            cmd = [self.cli_path] + args
            
            # Add database path if provided
            if db_path:
                cmd.extend(['--db', db_path])
            
            logger.info(f"Executing command: {' '.join(cmd)}")
            
            # Create temporary file for input if needed
            input_file = None
            if input_data:
                input_file = tempfile.NamedTemporaryFile(mode='w', delete=False)
                input_file.write(input_data)
                input_file.flush()
                input_file.seek(0)
            
            # Execute the command
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                input=input_data,
                timeout=30
            )
            
            # Clean up temporary file
            if input_file:
                os.unlink(input_file.name)
            
            if result.returncode == 0:
                return {
                    'success': True,
                    'output': result.stdout.strip(),
                    'error': None
                }
            else:
                return {
                    'success': False,
                    'output': result.stdout.strip(),
                    'error': result.stderr.strip()
                }
                
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'output': '',
                'error': 'Command timed out'
            }
        except FileNotFoundError:
            return {
                'success': False,
                'output': '',
                'error': f'Command not found: {self.cli_path}'
            }
        except Exception as e:
            return {
                'success': False,
                'output': '',
                'error': str(e)
            }
    
    def initialize_vault(self, db_path, master_password):
        """Initialize a new vault"""
        return self.execute_command(
            ['init'],
            input_data=f"{master_password}\n{master_password}\n",
            db_path=db_path
        )
    
    def add_credential(self, service, username, password, notes=None, db_path=None):
        """Add a new credential"""
        input_data = f"{password}\n"
        args = ['add', '--service', service, '--username', username]
        
        if notes:
            args.extend(['--notes', notes])
        
        return self.execute_command(args, input_data=input_data, db_path=db_path)
    
    def get_credential(self, service, password_only=False, db_path=None):
        """Get credentials for a service"""
        args = ['get', '--service', service]
        if password_only:
            args.append('--password-only')
        
        result = self.execute_command(args, db_path=db_path)
        
        if result['success'] and result['output']:
            # Parse the output
            lines = result['output'].strip().split('\n')
            if password_only:
                return {
                    'success': True,
                    'password': lines[0] if lines else ''
                }
            else:
                # Parse username and password from output
                username = ''
                password = ''
                for line in lines:
                    if line.startswith('Username:'):
                        username = line.replace('Username:', '').strip()
                    elif line.startswith('Password:'):
                        password = line.replace('Password:', '').strip()
                
                return {
                    'success': True,
                    'username': username,
                    'password': password,
                    'service': service
                }
        
        return result
    
    def list_services(self, db_path=None):
        """List all services"""
        result = self.execute_command(['list'], db_path=db_path)
        
        if result['success'] and result['output']:
            # Parse the list output
            services = []
            lines = result['output'].strip().split('\n')
            for line in lines:
                if line.strip():
                    services.append(line.strip())
            return {
                'success': True,
                'services': services
            }
        
        return result
    
    def delete_credential(self, service, db_path=None):
        """Delete a credential"""
        return self.execute_command(['delete', '--service', service], db_path=db_path)

class BridgeRequestHandler(BaseHTTPRequestHandler):
    def __init__(self, *args, bridge=None, **kwargs):
        self.bridge = bridge
        super().__init__(*args, **kwargs)
    
    def do_POST(self):
        """Handle POST requests"""
        try:
            # Parse the request
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            request_data = json.loads(post_data.decode('utf-8'))
            
            # Set CORS headers
            self.send_cors_headers()
            
            # Route the request
            response = self.handle_request(request_data)
            
            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
        except Exception as e:
            logger.error(f"Error handling request: {e}")
            self.send_error_response(str(e))
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_cors_headers()
        self.send_response(200)
        self.end_headers()
    
    def send_cors_headers(self):
        """Send CORS headers"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
    
    def handle_request(self, request_data):
        """Handle different types of requests"""
        command = request_data.get('command', [])
        db_path = request_data.get('dbPath')
        
        if not command:
            return {'success': False, 'error': 'No command specified'}
        
        action = command[0] if command else ''
        
        try:
            if action == 'init':
                # Initialize vault
                if len(command) < 3:
                    return {'success': False, 'error': 'Missing database path'}
                
                db_path = command[2]
                master_password = request_data.get('masterPassword', '')
                
                if not master_password:
                    return {'success': False, 'error': 'Master password required'}
                
                result = self.bridge.initialize_vault(db_path, master_password)
                return result
            
            elif action == 'add':
                # Add credential
                if len(command) < 6:
                    return {'success': False, 'error': 'Missing required parameters'}
                
                service = command[2]
                username = command[4]
                password = request_data.get('password', '')
                notes = request_data.get('notes')
                
                result = self.bridge.add_credential(service, username, password, notes, db_path)
                return result
            
            elif action == 'get':
                # Get credential
                if len(command) < 3:
                    return {'success': False, 'error': 'Missing service name'}
                
                service = command[2]
                password_only = '--password-only' in command
                
                result = self.bridge.get_credential(service, password_only, db_path)
                return result
            
            elif action == 'list':
                # List services
                result = self.bridge.list_services(db_path)
                return result
            
            elif action == 'delete':
                # Delete credential
                if len(command) < 3:
                    return {'success': False, 'error': 'Missing service name'}
                
                service = command[2]
                result = self.bridge.delete_credential(service, db_path)
                return result
            
            else:
                return {'success': False, 'error': f'Unknown command: {action}'}
        
        except Exception as e:
            logger.error(f"Error processing command {action}: {e}")
            return {'success': False, 'error': str(e)}
    
    def send_error_response(self, error_message):
        """Send an error response"""
        self.send_response(500)
        self.send_header('Content-Type', 'application/json')
        self.send_cors_headers()
        self.end_headers()
        response = {'success': False, 'error': error_message}
        self.wfile.write(json.dumps(response).encode('utf-8'))
    
    def log_message(self, format, *args):
        """Override to use our logger"""
        logger.info(f"{self.address_string()} - {format % args}")

def create_handler_class(bridge):
    """Create a request handler class with the bridge instance"""
    class Handler(BridgeRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, bridge=bridge, **kwargs)
    return Handler

def main():
    """Main function to run the bridge server"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Local Password Manager Bridge Server')
    parser.add_argument('--host', default='localhost', help='Host to bind to (default: localhost)')
    parser.add_argument('--port', type=int, default=8080, help='Port to bind to (default: 8080)')
    parser.add_argument('--cli-path', default='local-password-manager', 
                       help='Path to the local password manager CLI (default: local-password-manager)')
    
    args = parser.parse_args()
    
    # Create the bridge
    bridge = PasswordManagerBridge(args.cli_path)
    
    # Create the server
    handler_class = create_handler_class(bridge)
    server = HTTPServer((args.host, args.port), handler_class)
    
    logger.info(f"Starting bridge server on {args.host}:{args.port}")
    logger.info(f"Using CLI path: {args.cli_path}")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Shutting down bridge server...")
        server.shutdown()

if __name__ == '__main__':
    main()

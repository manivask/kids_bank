#!/usr/bin/env python3
"""
KidsBank Development & Testing Server
Zero-dependency static file server with clean MIME handling and automatic port fallback.
"""

import os
import sys
import socket
from http.server import HTTPServer, SimpleHTTPRequestHandler

DEFAULT_PORT = 8085
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def is_port_free(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) != 0

def find_available_port(start_port=DEFAULT_PORT):
    port = start_port
    while port < start_port + 50:
        if is_port_free(port):
            return port
        port += 1
    return DEFAULT_PORT

class KidsBankHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        # Enable CORS and disable aggressive caching during local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

def run_server():
    port = find_available_port(DEFAULT_PORT)
    server_address = ('127.0.0.1', port)
    httpd = HTTPServer(server_address, KidsBankHandler)
    
    print("\n" + "="*56)
    print(" 🏦 KidsBank - Tablet-Friendly Financial Learning App")
    print("="*56)
    print(f" Serving directory: {BASE_DIR}")
    print(f" URL: http://127.0.0.1:{port}")
    print(" Press Ctrl+C to stop the server.")
    print("="*56 + "\n")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        httpd.server_close()

if __name__ == '__main__':
    run_server()

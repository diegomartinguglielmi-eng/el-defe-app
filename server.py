#!/usr/bin/env python3
import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

class SPAHandler(SimpleHTTPRequestHandler):
    """Serve Single Page Application with fallback to index.html"""
    
    def __init__(self, *args, directory=None, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)
    
    def do_GET(self):
        # Parse path
        path = self.path.split('?')[0]  # Remove query string
        
        # Try the requested path first
        file_path = Path(self.directory) / path.lstrip('/')
        if file_path.is_file():
            return super().do_GET()
        
        # For non-file requests, fallback to index.html
        if not path.endswith(('.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.json')):
            self.path = '/index.html'
        
        return super().do_GET()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    directory = '/app/ui-operativa-base'
    
    handler = lambda *args, **kwargs: SPAHandler(*args, directory=directory, **kwargs)
    server = HTTPServer(('0.0.0.0', port), handler)
    
    print(f'Serving {directory} on port {port}...')
    server.serve_forever()


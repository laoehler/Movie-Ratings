from flask import Flask, jsonify, send_from_directory
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__, static_folder='.', static_url_path='')

@app.route('/api/config', methods=['GET'])
def get_config():
    """Serve Supabase configuration to frontend"""
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_PUBLISHABLE_KEY')
    print(f'Returning config: URL={url}, KEY={key[:20]}...' if key else 'KEY not found')
    return jsonify({
        'SUPABASE_URL': url,
        'SUPABASE_PUBLISHABLE_KEY': key
    })

@app.route('/')
def index():
    """Serve index.html"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files (CSS, JS, etc.)"""
    if path.startswith('api/'):
        # Don't serve API paths as static files
        from flask import abort
        abort(404)
    return send_from_directory('.', path)

if __name__ == '__main__':
    app.run(debug=True, port=8000)


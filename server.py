from flask import Flask, jsonify, send_from_directory, request
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from supabase import create_client
import os

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__, static_folder='.', static_url_path='')

# Supabase setup
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
SUPABASE_PUBLISHABLE_KEY = os.getenv('SUPABASE_PUBLISHABLE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


@app.route('/api/config', methods=['GET'])
def get_config():
    """Serve Supabase configuration to frontend"""
    return jsonify({
        'SUPABASE_URL': SUPABASE_URL,
        'SUPABASE_PUBLISHABLE_KEY': SUPABASE_PUBLISHABLE_KEY
    })


@app.route('/api/register', methods=['POST'])
def register():
    """Register a new user with a hashed password"""
    data = request.get_json()

    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    try:
        # Check if username already exists
        existing_user = (
            supabase
            .table('users')
            .select('user_id')
            .eq('username', username)
            .execute()
        )

        if existing_user.data:
            return jsonify({'error': 'Username already exists'}), 409

        # Hash password before storing it
        hashed_password = generate_password_hash(password)

        response = (
            supabase
            .table('users')
            .insert({
                'username': username,
                'password': hashed_password
            })
            .execute()
        )

        if not response.data:
            return jsonify({'error': 'Could not create user'}), 500

        return jsonify({'message': 'Registration successful'}), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/login', methods=['POST'])
def login():
    """Log in user by checking password hash"""
    data = request.get_json()

    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    try:
        response = (
            supabase
            .table('users')
            .select('*')
            .eq('username', username)
            .execute()
        )

        if not response.data:
            return jsonify({'error': 'Invalid username or password'}), 401

        user = response.data[0]

        if not check_password_hash(user['password'], password):
            return jsonify({'error': 'Invalid username or password'}), 401

        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user['user_id'],
                'username': user['username']
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/')
def index():
    """Serve index.html"""
    return send_from_directory('.', 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    """Serve static files (CSS, JS, etc.)"""
    if path.startswith('api/'):
        from flask import abort
        abort(404)

    return send_from_directory('.', path)


if __name__ == '__main__':
    app.run(debug=True, port=8000)

"""
Script to populate Supabase database with movie data from complete_data.csv

Requirements:
- pip install python-dotenv
- pip install supabase

Usage:
    python populate_db.py
"""

import os
import csv
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from .env file
load_dotenv()

# Get Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")  

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_KEY must be set in .env file")
    sys.exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def parse_genres(genre_string):
    """Parse comma-separated genres string into a list"""
    if not genre_string:
        return []
    return [g.strip() for g in genre_string.split(',')]

def get_or_create_genre(genre_name):
    """Get or create a genre and return its ID"""
    try:
        # Try to get existing genre
        response = supabase.table('genres').select('genre_id').eq('genre_name', genre_name).execute()
        
        if response.data:
            return response.data[0]['genre_id']
        
        # Create new genre if it doesn't exist
        response = supabase.table('genres').insert({'genre_name': genre_name}).execute()
        return response.data[0]['genre_id']
    except Exception as e:
        print(f"Error getting/creating genre '{genre_name}': {e}")
        return None

def populate_movies(csv_file_path):
    """Parse CSV and populate movies table"""
    print(f"Reading CSV file: {csv_file_path}")
    
    if not os.path.exists(csv_file_path):
        print(f"Error: File not found: {csv_file_path}")
        sys.exit(1)

    movies_count = 0
    errors_count = 0

    try:
        with open(csv_file_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            
            for row_num, row in enumerate(reader, start=2):  # Start at 2 since row 1 is header
                try:
                    # Extract movie data
                    title = row.get('primaryTitle', '').strip()
                    year = row.get('year', '')
                    runtime = row.get('runtimeMinutes', '')
                    rating = row.get('averageRating', '')
                    genres_str = row.get('genres', '')

                    # Skip if no title
                    if not title:
                        print(f"Row {row_num}: Skipping - no title")
                        continue

                    # Convert to appropriate types
                    year = int(float(year)) if year and year != 'None' and year != '' else None
                    runtime = int(float(runtime)) if runtime and runtime != 'None' and runtime != '' else None
                    rating = float(rating) if rating and rating != 'None' and rating != '' else None
                    
                    # Create a shorter, unique movie_id (max 20 chars)
                    # Use first 15 chars of title + hash of full title for uniqueness
                    import hashlib
                    title_hash = hashlib.md5(title.encode()).hexdigest()[:4]
                    movie_id = f"{title.lower().replace(' ', '_')[:15]}_{title_hash}"

                    # Check if movie already exists
                    existing = supabase.table('movies').select('movie_id').eq('movie_id', movie_id).execute()
                    
                    if existing.data:
                        print(f"Row {row_num}: Movie '{title}' already exists, skipping")
                        continue

                    # Insert movie
                    movie_data = {
                        'movie_id': movie_id,
                        'title': title,
                        'release_year': year,
                        'runtime_minutes': runtime,
                        'imdb_rating': rating
                    }

                    response = supabase.table('movies').insert(movie_data).execute()
                    
                    if response.data:
                        print(f"Row {row_num}: Added movie '{title}'")
                        movies_count += 1

                        # Add genres
                        if genres_str:
                            genres_list = parse_genres(genres_str)
                            for genre_name in genres_list:
                                genre_id = get_or_create_genre(genre_name)
                                if genre_id:
                                    try:
                                        supabase.table('movie_genres').insert({
                                            'movie_id': movie_id,
                                            'genre_id': genre_id
                                        }).execute()
                                    except Exception as e:
                                        print(f"Error adding genre '{genre_name}' to movie: {e}")
                    else:
                        print(f"Row {row_num}: Failed to add movie '{title}'")
                        errors_count += 1

                except Exception as e:
                    print(f"Row {row_num}: Error processing row '{title}' - {e}")
                    errors_count += 1
                    continue

    except Exception as e:
        print(f"Error reading CSV file: {e}")
        sys.exit(1)

    print(f"\nSummary:")
    print(f"Movies added: {movies_count}")
    print(f"Errors: {errors_count}")

if __name__ == "__main__":
    # Get CSV file path
    csv_path = "complete_data.csv"
    
    # Allow passing custom path as argument
    if len(sys.argv) > 1:
        csv_path = sys.argv[1]

    print("=" * 50)
    print("🎬 Movie Database Populator")
    print("=" * 50)
    print()

    populate_movies(csv_path)
    
    print("\n✅ Database population complete!")

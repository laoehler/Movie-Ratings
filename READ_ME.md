# Movie Ratings Application - Setup Guide

## Project Overview

This is a full-stack web application for rating and managing movies with:
- **Frontend**: HTML/CSS/JavaScript interface for browsing and rating movies
- **Backend**: Supabase PostgreSQL database storing users, movies, and ratings
- **Database**: Pre-populated with movie data from CSV

## Prerequisites

- Python 3.7+ (for running the database population script)
- A web browser
- The Supabase database is already configured and accessible

## Setup Instructions

### Step 1: Install Python Dependencies

From the project directory, install the required Python packages:

```bash
pip install -r requirements.txt
```

### Step 2: Populate the Database (__already done__)

Run the Python script to load movie data into the database:

```bash
python populate_db.py
```

This will read from `complete_data.csv` and populate the movies and genres into your Supabase database. The script will skip any duplicate entries.

### Step 3: Start a Local Web Server

Start a simple HTTP server to serve the website:

```bash
python3 server.py #hosted at port 8000
```

### Step 4: Open the Application

Open your web browser and navigate to:

```
http://localhost:8000
```

### Step 5: Test the Application

1. **Create an account**: Click "Register" and create a new user account with a username and password

2. **Log in**: Use your credentials to log in to the application

3. **Browse movies**: After logging in, you'll see a grid of available movies

4. **Rate a movie**: Click on any movie, enter a rating (0-10), add an optional review, and click "Save Rating"

5. **View your ratings**: Your ratings will be saved and displayed in the application

## Stopping the Server

To stop the web server, press `Ctrl+C` in the terminal where it's running.



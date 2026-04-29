// Initialize Supabase
console.log('app.js is loading...');

let supabaseClient = null;
let currentUser = null;
let searchTimeout = null;

// Load configuration from server (via .env file)
async function initializeApp() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        
        // Initialize Supabase client with config from server
        supabaseClient = supabase.createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY);
        console.log('Supabase client initialized');
        
        // Check auth status after client is ready
        checkAuthStatus();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        document.getElementById('authSection').innerHTML = '<p style="color: red;">Error loading configuration. Please refresh the page.</p>';
    }
}

// Check if user is logged in
async function checkAuthStatus() {
    const userSession = localStorage.getItem('currentUser');
    if (userSession) {
        currentUser = JSON.parse(userSession);
        showAppSection();
        loadMovies();
    } else {
        showAuthSection();
    }
}

// Toggle between login and register forms
function toggleForms() {
    console.log('toggleForms function called');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    loginForm.style.display = loginForm.style.display === 'none' ? 'block' : 'none';
    registerForm.style.display = registerForm.style.display === 'none' ? 'block' : 'none';
}

// Handle Login
document.getElementById('loginFormElement')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const messageDiv = document.getElementById('loginMessage');

    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (error || !data) {
            messageDiv.textContent = 'Invalid username or password';
            messageDiv.className = 'message error';
            return;
        }

        // Simple password check (NO SECURITY - for development only)
        if (data.password !== password) {
            messageDiv.textContent = 'Invalid username or password';
            messageDiv.className = 'message error';
            return;
        }

        currentUser = { id: data.user_id, username: data.username };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        messageDiv.textContent = 'Login successful!';
        messageDiv.className = 'message success';

        setTimeout(() => {
            showAppSection();
            loadMovies();
        }, 500);
    } catch (error) {
        messageDiv.textContent = 'Error logging in: ' + error.message;
        messageDiv.className = 'message error';
    }
});

// Handle Registration
document.getElementById('registerFormElement')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    const messageDiv = document.getElementById('registerMessage');

    if (password !== passwordConfirm) {
        messageDiv.textContent = 'Passwords do not match';
        messageDiv.className = 'message error';
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('users')
            .insert([{ username, password }])
            .select()
            .single();

        if (error) {
            messageDiv.textContent = 'Username already exists or error creating account';
            messageDiv.className = 'message error';
            return;
        }

        messageDiv.textContent = 'Registration successful! Please login.';
        messageDiv.className = 'message success';

        setTimeout(() => {
            toggleForms();
            document.getElementById('registerFormElement').reset();
        }, 1500);
    } catch (error) {
        messageDiv.textContent = 'Error registering: ' + error.message;
        messageDiv.className = 'message error';
    }
});

// Handle Logout
document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    currentUser = null;
    document.getElementById('loginFormElement').reset();
    document.getElementById('registerFormElement').reset();
    showAuthSection();
});

// Show Auth Section
function showAuthSection() {
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('appSection').style.display = 'none';
}

// Show App Section
function showAppSection() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('appSection').style.display = 'block';
    document.getElementById('currentUser').textContent = `Logged in as: ${currentUser.username}`;
}

// Render a list of movie objects into the moviesList div
function renderMovies(movies) {
    const moviesList = document.getElementById('moviesList');
    moviesList.innerHTML = '';

    if (movies.length === 0) {
        moviesList.innerHTML = '<p class="no-results">No movies found.</p>';
        return;
    }

    movies.forEach(movie => {
        const genres = movie.movie_genres?.map(mg => mg.genres.genre_name).join(', ') || 'N/A';
        const movieCard = document.createElement('div');
        movieCard.className = 'movie-card';
        movieCard.onclick = () => showMovieDetail(movie);

        movieCard.innerHTML = `
            <div class="movie-card-header">
                <div class="movie-card-title">${movie.title}</div>
            </div>
            <div class="movie-card-body">
                <div class="movie-card-info">Year: ${movie.release_year || 'N/A'}</div>
                <div class="movie-card-info">Runtime: ${movie.runtime_minutes || 'N/A'} min</div>
                <div class="movie-card-info">Genres: ${genres}</div>
                <div class="movie-card-rating">IMDB: ${movie.imdb_rating || 'N/A'}/10</div>
            </div>
        `;

        moviesList.appendChild(movieCard);
    });
}

// Load ALL movies from database (no limit)
async function loadMovies() {
    try {
        const { data, error } = await supabaseClient
            .from('movies')
            .select('*, movie_genres(genres(genre_name))')
            .order('title', { ascending: true });

        if (error) {
            console.error('Error loading movies:', error);
            return;
        }

        renderMovies(data);
    } catch (error) {
        console.error('Error loading movies:', error);
    }
}

// Search movies by title (debounced to avoid firing on every keystroke)
function searchMovies(query) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        const trimmed = query.trim();

        // If search box is empty, reload the full list
        if (!trimmed) {
            loadMovies();
            return;
        }

        try {
            const { data, error } = await supabaseClient
                .from('movies')
                .select('*, movie_genres(genres(genre_name))')
                .ilike('title', `%${trimmed}%`)
                .order('title', { ascending: true });

            if (error) {
                console.error('Error searching movies:', error);
                return;
            }

            renderMovies(data);
        } catch (error) {
            console.error('Error searching movies:', error);
        }
    }, 300); // 300ms debounce delay
}

// Show movie detail modal
async function showMovieDetail(movie) {
    const modal = document.getElementById('movieModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');

    modalTitle.textContent = movie.title;

    // Fetch user's rating if exists
    let userRating = null;
    try {
        const { data } = await supabaseClient
            .from('user_ratings')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('movie_id', movie.movie_id)
            .single();

        userRating = data;
    } catch (error) {
        // No rating exists yet
    }

    const genres = await supabaseClient
        .from('movie_genres')
        .select('genres(genre_name)')
        .eq('movie_id', movie.movie_id);

    const genreList = genres.data?.map(g => g.genres.genre_name).join(', ') || 'N/A';

    modalContent.innerHTML = `
        <div class="movie-detail">
            <label>Year:</label>
            <div>${movie.release_year || 'N/A'}</div>
        </div>
        <div class="movie-detail">
            <label>Runtime:</label>
            <div>${movie.runtime_minutes || 'N/A'} minutes</div>
        </div>
        <div class="movie-detail">
            <label>Genres:</label>
            <div>${genreList}</div>
        </div>
        <div class="movie-detail">
            <label>IMDB Rating:</label>
            <div>${movie.imdb_rating || 'N/A'}/10</div>
        </div>
        <div class="movie-detail">
            <label for="userRating">Your Rating (0-10):</label>
            <input type="number" id="userRating" min="0" max="10" step="0.1" value="${userRating?.rating || ''}" placeholder="Enter your rating">
        </div>
        <div class="movie-detail">
            <label for="userDescription">Your Review:</label>
            <textarea id="userDescription" placeholder="Write your review...">${userRating?.description || ''}</textarea>
        </div>
        <div class="btn-group">
            <button class="btn-cancel" onclick="closeMovieModal()">Close</button>
            <button class="btn-submit" onclick="saveUserRating('${movie.movie_id}')">Save Rating</button>
        </div>
    `;

    modal.style.display = 'block';
}

// Close movie modal
function closeMovieModal() {
    document.getElementById('movieModal').style.display = 'none';
}

// Save user rating
async function saveUserRating(movieId) {
    const rating = parseFloat(document.getElementById('userRating').value);
    const description = document.getElementById('userDescription').value;

    if (isNaN(rating)) {
        alert('Please enter a valid rating');
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('user_ratings')
            .upsert(
                {
                    user_id: currentUser.id,
                    movie_id: movieId,
                    rating: rating,
                    description: description
                },
                { onConflict: 'user_id,movie_id' }
            );

        if (error) {
            alert('Error saving rating: ' + error.message);
            return;
        }

        alert('Rating saved successfully!');
        closeMovieModal();
    } catch (error) {
        alert('Error saving rating: ' + error.message);
    }
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById('movieModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}


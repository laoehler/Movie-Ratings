console.log('app.js is loading...');

let supabaseClient = null;
let currentUser = null;
let searchTimeout = null;

// Load configuration from server (via .env file)
async function initializeApp() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();

        supabaseClient = supabase.createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY);
        console.log('Supabase client initialized');

        await loadGenres();
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
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const result = await response.json();

        if (!response.ok) {
            messageDiv.textContent = result.error || 'Invalid username or password';
            messageDiv.className = 'message error';
            return;
        }

        currentUser = result.user;
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
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const result = await response.json();

        if (!response.ok) {
            messageDiv.textContent = result.error || 'Error creating account';
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
    document.getElementById('moviesSection').style.display = 'block';
    document.getElementById('myRatingsSection').style.display = 'none';
}

// Nav button handlers
document.getElementById('moviesPageBtn')?.addEventListener('click', () => {
    console.log('Movies button clicked');
    showMoviesPage();
});

document.getElementById('myRatingsPageBtn')?.addEventListener('click', () => {
    console.log('My Ratings button clicked');
    showMyRatingsPage();
});

function showMoviesPage() {
    const moviesSection = document.getElementById('moviesSection');
    const myRatingsSection = document.getElementById('myRatingsSection');

    if (!moviesSection || !myRatingsSection) {
        console.error('Missing moviesSection or myRatingsSection in index.html');
        return;
    }

    moviesSection.style.display = 'block';
    myRatingsSection.style.display = 'none';
    loadMovies();
}

async function showMyRatingsPage() {
    const moviesSection = document.getElementById('moviesSection');
    const myRatingsSection = document.getElementById('myRatingsSection');

    if (!moviesSection || !myRatingsSection) {
        console.error('Missing moviesSection or myRatingsSection in index.html');
        return;
    }

    moviesSection.style.display = 'none';
    myRatingsSection.style.display = 'block';
    await loadMyRatings();
}

// Render a list of movie objects into the moviesList div
function renderMovies(movies) {
    const moviesList = document.getElementById('moviesList');
    moviesList.innerHTML = '';

    const uniqueMovies = [];
    const seenMovies = new Set();

    movies.forEach(movie => {
        const key = `${movie.title}-${movie.release_year}-${movie.runtime_minutes}-${movie.imdb_rating}`;
        if (!seenMovies.has(key)) {
            seenMovies.add(key);
            uniqueMovies.push(movie);
        }
    });

    if (uniqueMovies.length === 0) {
        moviesList.innerHTML = '<p class="no-results">No movies found.</p>';
        return;
    }

    uniqueMovies.forEach(movie => {
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

// Load movies from database
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

// Show movie detail modal
async function showMovieDetail(movie) {
    const modal = document.getElementById('movieModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');

    modalTitle.textContent = movie.title;

    // Fetch current user's rating
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

    // Fetch genres
    const genres = await supabaseClient
        .from('movie_genres')
        .select('genres(genre_name)')
        .eq('movie_id', movie.movie_id);
    const genreList = genres.data?.map(g => g.genres.genre_name).join(', ') || 'N/A';

    // Fetch all community ratings with usernames
    let allRatings = [];
    try {
        const { data: ratingsData, error: ratingsError } = await supabaseClient
            .from('user_ratings')
            .select('rating, description, users(username)')
            .eq('movie_id', movie.movie_id)
            .order('rating', { ascending: false });

        if (!ratingsError && ratingsData) {
            allRatings = ratingsData;
        }
    } catch (error) {
        console.error('Error fetching community ratings:', error);
    }

    // Build ratings list HTML
    const ratingsListHTML = allRatings.length > 0
        ? allRatings.map((r, index) => {
            const username = r.users?.username || 'Unknown';
            return `
                <button class="community-rating-btn" onclick="showRatingDetail(${index}, ${JSON.stringify(allRatings).replace(/"/g, '&quot;')})">
                    <span class="community-rating-score">${r.rating}/10</span>
                    <span class="community-rating-user">${username}</span>
                </button>
            `;
        }).join('')
        : '<p class="no-results">No community ratings yet.</p>';

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

        <div class="community-ratings-section">
            <h3 class="community-ratings-title">Community Ratings</h3>
            <div class="community-ratings-list">
                ${ratingsListHTML}
            </div>
            <div id="ratingDetailView" class="rating-detail-view" style="display: none;"></div>
        </div>

        <div class="btn-group">
            <button class="btn-cancel" onclick="closeMovieModal()">Close</button>
            <button class="btn-submit" onclick="saveUserRating('${movie.movie_id}')">Save Rating</button>
        </div>
    `;

    modal.style.display = 'block';
}

// Show an expanded rating detail inside the modal
function showRatingDetail(index, ratingsJSON) {
    const ratings = typeof ratingsJSON === 'string' ? JSON.parse(ratingsJSON) : ratingsJSON;
    const r = ratings[index];
    const username = r.users?.username || 'Unknown';
    const detailView = document.getElementById('ratingDetailView');

    // Deactivate previously active button
    document.querySelectorAll('.community-rating-btn').forEach(btn => btn.classList.remove('active'));
    const allBtns = document.querySelectorAll('.community-rating-btn');
    if (allBtns[index]) allBtns[index].classList.add('active');

    detailView.style.display = 'block';
    detailView.innerHTML = `
        <div class="rating-detail-header">
            <span class="rating-detail-score">${r.rating}/10</span>
            <span class="rating-detail-username">${username}</span>
            <button class="rating-detail-close" onclick="closeRatingDetail()" title="Close">&times;</button>
        </div>
        <p class="rating-detail-text">${r.description || 'No review written.'}</p>
    `;
}

// Close the expanded rating detail inside the modal
function closeRatingDetail() {
    const detailView = document.getElementById('ratingDetailView');
    if (detailView) detailView.style.display = 'none';
    document.querySelectorAll('.community-rating-btn').forEach(btn => btn.classList.remove('active'));
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
                { user_id: currentUser.id, movie_id: movieId, rating, description },
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
window.onclick = function (event) {
    const modal = document.getElementById('movieModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
};

// Load genres and render checkboxes for filtering
async function loadGenres() {
    try {
        const { data, error } = await supabaseClient
            .from('genres')
            .select('genre_name')
            .order('genre_name', { ascending: true });

        if (error) {
            console.error('Error loading genres:', error);
            return;
        }

        const container = document.getElementById('genreFilters');
        if (!container) return;

        container.innerHTML = data.map(g =>
            `<label class="genre-label"><input type="checkbox" value="${g.genre_name}" onchange="applyFilters()"> ${g.genre_name}</label>`
        ).join('') + `<button type="button" onclick="clearGenreFilters()">Clear</button>`;
    } catch (err) {
        console.error('Failed to load genres:', err);
    }
}

function clearGenreFilters() {
    document.querySelectorAll('#genreFilters input[type="checkbox"]').forEach(cb => cb.checked = false);
    applyFilters();
}

function applyFilters() {
    const query = document.getElementById('movieSearch')?.value || '';
    const selectedGenres = Array.from(
        document.querySelectorAll('#genreFilters input[type="checkbox"]:checked')
    ).map(cb => cb.value);
    searchMovies(query, selectedGenres);
}

function searchMovies(query = '', selectedGenres = []) {
    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(async () => {
        const trimmed = query.trim();

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

            let filtered = data || [];

            if (selectedGenres.length > 0) {
                filtered = filtered.filter(movie => {
                    const movieGenres = movie.movie_genres
                        ?.map(mg => mg.genres?.genre_name)
                        .filter(Boolean) || [];
                    return selectedGenres.every(g => movieGenres.includes(g));
                });
            }

            renderMovies(filtered);
        } catch (error) {
            console.error('Error searching movies:', error);
        }
    }, 300);
}

// Load My Ratings page
async function loadMyRatings() {
    console.log('Loading my ratings...');
    const ratingsList = document.getElementById('myRatingsList');
    ratingsList.innerHTML = '';

    if (!currentUser) {
        ratingsList.innerHTML = '<p class="no-results">Please log in to see your ratings.</p>';
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('user_ratings')
            .select(`
                rating,
                description,
                movies (
                    movie_id,
                    title,
                    release_year,
                    runtime_minutes,
                    imdb_rating,
                    movie_genres (
                        genres (
                            genre_name
                        )
                    )
                )
            `)
            .eq('user_id', currentUser.id)
            .order('rating', { ascending: false });

        if (error) {
            console.error('Error loading user ratings:', error);
            ratingsList.innerHTML = '<p class="no-results">Error loading your ratings.</p>';
            return;
        }

        if (!data || data.length === 0) {
            ratingsList.innerHTML = '<p class="no-results">You have not rated any movies yet.</p>';
            return;
        }

        data.forEach(item => {
            const movie = item.movies;
            if (!movie) return;

            const genres = movie.movie_genres
                ?.map(mg => mg.genres?.genre_name)
                .filter(Boolean)
                .join(', ') || 'N/A';

            const ratingCard = document.createElement('div');
            ratingCard.className = 'rating-card';
            ratingCard.innerHTML = `
                <div class="rating-card-header">
                    <h3>${movie.title}</h3>
                    <span class="user-rating-badge">Your Rating: ${item.rating}/10</span>
                </div>
                <div class="rating-card-body">
                    <p><strong>Year:</strong> ${movie.release_year || 'N/A'}</p>
                    <p><strong>Runtime:</strong> ${movie.runtime_minutes || 'N/A'} min</p>
                    <p><strong>Genres:</strong> ${genres}</p>
                    <p><strong>IMDB:</strong> ${movie.imdb_rating || 'N/A'}/10</p>
                    <p><strong>Your Review:</strong> ${item.description || 'No review written.'}</p>
                </div>
            `;
            ratingsList.appendChild(ratingCard);
        });
    } catch (error) {
        console.error('Error loading my ratings:', error);
        ratingsList.innerHTML = '<p class="no-results">Error loading your ratings.</p>';
    }
}
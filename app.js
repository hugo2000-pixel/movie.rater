const API_KEY = '9264cb9';
const BASE_URL = 'https://www.omdbapi.com/';

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsContainer = document.getElementById('resultsContainer');
const statusMessage = document.getElementById('statusMessage');

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

async function handleSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    // UI Feedback
    statusMessage.textContent = 'Searching the cinematic universe...';
    resultsContainer.innerHTML = ''; // Clear previous results
    
    // Add some skeleton loaders to indicate progress
    for(let i=0; i<8; i++) {
        resultsContainer.innerHTML += createSkeletonCard();
    }

    try {
        // Step 1: Search for movies
        const searchRes = await fetch(`${BASE_URL}?apikey=${API_KEY}&s=${encodeURIComponent(query)}&type=movie`);
        const searchData = await searchRes.json();

        if (searchData.Response === 'False') {
            statusMessage.textContent = searchData.Error || 'No movies found.';
            resultsContainer.innerHTML = '';
            return;
        }

        const movies = searchData.Search;
        statusMessage.textContent = `Found ${movies.length} result(s). Analyzing ratings...`;
        
        // Step 2: Fetch details for each movie to get ratings
        resultsContainer.innerHTML = ''; // Clear skeletons
        
        const moviePromises = movies.map(movie => fetchMovieDetails(movie.imdbID));
        const detailedMovies = await Promise.all(moviePromises);
        
        // Render detailed movies
        statusMessage.textContent = '';
        detailedMovies.forEach(movie => {
            if (movie && movie.Response === "True") {
                const card = createMovieCard(movie);
                resultsContainer.appendChild(card);
            }
        });

    } catch (error) {
        console.error('Error fetching data:', error);
        statusMessage.textContent = 'An error occurred while fetching data. Please try again.';
        resultsContainer.innerHTML = '';
    }
}

async function fetchMovieDetails(imdbID) {
    try {
        const res = await fetch(`${BASE_URL}?apikey=${API_KEY}&i=${imdbID}`);
        return await res.json();
    } catch (error) {
        console.error(`Error fetching details for ${imdbID}:`, error);
        return null;
    }
}

// Utility to normalize ratings from different sources into a percentage (0-100)
function normalizeRating(source, value) {
    if (!value || value === 'N/A') return null;
    
    if (source === 'Internet Movie Database') {
        // Format: "8.7/10"
        const score = parseFloat(value.split('/')[0]);
        return Math.round(score * 10);
    } else if (source === 'Rotten Tomatoes') {
        // Format: "83%"
        return parseInt(value.replace('%', ''));
    } else if (source === 'Metacritic') {
        // Format: "73/100"
        return parseInt(value.split('/')[0]);
    }
    return null;
}

function calculateAverageRating(ratings) {
    if (!ratings || ratings.length === 0) return { avg: null, breakdown: [] };
    
    let sum = 0;
    let count = 0;
    const breakdown = [];

    ratings.forEach(r => {
        const normalized = normalizeRating(r.Source, r.Value);
        if (normalized !== null && !isNaN(normalized)) {
            sum += normalized;
            count++;
            breakdown.push({ source: r.Source, score: normalized });
        }
    });

    if (count === 0) return { avg: null, breakdown: [] };
    
    return {
        avg: Math.round(sum / count),
        breakdown
    };
}

function getRatingColorClass(rating) {
    if (rating === null) return 'rating-na';
    if (rating >= 70) return 'rating-good';
    if (rating >= 50) return 'rating-mid';
    return 'rating-bad';
}

function createMovieCard(movie) {
    const { avg, breakdown } = calculateAverageRating(movie.Ratings);
    
    const card = document.createElement('div');
    card.className = 'movie-card';
    
    const posterSrc = (movie.Poster && movie.Poster !== 'N/A') ? movie.Poster : 'https://via.placeholder.com/300x450/1e293b/94a3b8?text=No+Poster';
    const ratingDisplay = avg !== null ? avg : '--';
    const colorClass = getRatingColorClass(avg);

    let sourcesHtml = '';
    if (breakdown.length > 0) {
        sourcesHtml = `
            <div class="sources-breakdown">
                <div class="sources-title">Rating Sources</div>
                ${breakdown.map(b => `
                    <div class="source-item">
                        <span class="source-name">${getShortSourceName(b.source)}</span>
                        <span class="source-value">${b.score}%</span>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        sourcesHtml = `
            <div class="sources-breakdown">
                <div class="source-item">
                    <span class="source-name">No ratings available</span>
                </div>
            </div>
        `;
    }

    card.innerHTML = `
        <div class="movie-poster-container">
            <img src="${posterSrc}" alt="${movie.Title} Poster" class="movie-poster" loading="lazy">
            <div class="rating-badge ${colorClass}">
                ${ratingDisplay}<span>%</span>
            </div>
        </div>
        <div class="movie-info">
            <h3 class="movie-title">${movie.Title}</h3>
            <div class="movie-meta">
                <span>${movie.Year}</span>
                <span class="separator"></span>
                <span>${movie.Runtime !== 'N/A' ? movie.Runtime : 'Unknown'}</span>
                <span class="separator"></span>
                <span>${movie.Rated !== 'N/A' ? movie.Rated : 'NR'}</span>
            </div>
            <div class="movie-genre">${movie.Genre !== 'N/A' ? movie.Genre : 'Genre unknown'}</div>
            <p class="movie-plot">${movie.Plot !== 'N/A' ? movie.Plot : 'No plot available.'}</p>
            
            <div class="movie-crew">
                <div class="crew-item"><strong>Director:</strong> ${movie.Director}</div>
                <div class="crew-item"><strong>Starring:</strong> ${movie.Actors}</div>
                ${movie.BoxOffice && movie.BoxOffice !== 'N/A' ? `<div class="crew-item"><strong>Box Office:</strong> ${movie.BoxOffice}</div>` : ''}
            </div>

            ${sourcesHtml}
        </div>
    `;
    
    return card;
}

function getShortSourceName(source) {
    if (source === 'Internet Movie Database') return 'IMDb';
    return source;
}

function createSkeletonCard() {
    return `
        <div class="movie-card skeleton" style="height: 450px; border: none;">
            <div class="movie-poster-container" style="background: transparent;"></div>
            <div class="movie-info">
                <div style="height: 24px; width: 80%; background: rgba(255,255,255,0.1); border-radius: 4px; margin-bottom: 12px;"></div>
                <div style="height: 16px; width: 40%; background: rgba(255,255,255,0.1); border-radius: 4px;"></div>
            </div>
        </div>
    `;
}

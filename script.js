// ===== PokeAPI Configuration =====
const API_BASE = 'https://pokeapi.co/api/v2';
const POKEMON_PER_PAGE = 20;

// ===== State Management =====
let allPokemon = [];
let filteredPokemon = [];
let displayedCount = POKEMON_PER_PAGE;
let types = [];
let cache = {};

// ===== DOM Elements =====
const pokemonGrid = document.getElementById('pokemonGrid');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const typeFilter = document.getElementById('typeFilter');
const sortSelect = document.getElementById('sortSelect');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modalBody');
const closeBtn = document.querySelector('.close');
const totalPokemonEl = document.getElementById('totalPokemon');
const loadingStatusEl = document.getElementById('loadingStatus');

// ===== Event Listeners =====
searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});
typeFilter.addEventListener('change', handleFilterChange);
sortSelect.addEventListener('change', handleSortChange);
loadMoreBtn.addEventListener('click', loadMorePokemon);
closeBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

// ===== Initialize Application =====
async function init() {
    try {
        loadingStatusEl.textContent = 'Memuat data Pokemon...';
        
        // Fetch initial Pokemon data
        await fetchPokemonList();
        
        // Fetch all types
        await fetchAllTypes();
        
        // Populate type filter
        populateTypeFilter();
        
        // Display initial Pokemon
        displayPokemon();
        
        loadingStatusEl.textContent = '✓ Data dimuat sempurna!';
        setTimeout(() => {
            loadingStatusEl.textContent = '';
        }, 3000);
    } catch (error) {
        console.error('Error initializing app:', error);
        loadingStatusEl.textContent = '❌ Gagal memuat data. Coba refresh halaman.';
    }
}

// ===== Fetch Functions =====
async function fetchPokemonList() {
    try {
        const response = await fetch(`${API_BASE}/pokemon?limit=1000&offset=0`);
        const data = await response.json();
        
        allPokemon = data.results;
        filteredPokemon = [...allPokemon];
        totalPokemonEl.textContent = `Total: ${allPokemon.length} Pokemon`;
        
        // Fetch detailed info for each Pokemon
        allPokemon = await Promise.all(
            allPokemon.map(pokemon => fetchPokemonDetails(pokemon))
        );
        filteredPokemon = [...allPokemon];
    } catch (error) {
        console.error('Error fetching Pokemon list:', error);
        throw error;
    }
}

async function fetchPokemonDetails(pokemon) {
    try {
        if (cache[pokemon.name]) {
            return cache[pokemon.name];
        }
        
        const response = await fetch(pokemon.url);
        const data = await response.json();
        
        const pokemonObj = {
            id: data.id,
            name: data.name,
            image: data.sprites.other['official-artwork'].front_default || data.sprites.front_default,
            types: data.types.map(t => t.type.name),
            stats: data.stats,
            abilities: data.abilities.map(a => a.ability.name),
            moves: data.moves.slice(0, 5).map(m => m.move.name),
            height: data.height / 10,
            weight: data.weight / 10,
            baseExperience: data.base_experience,
        };
        
        cache[pokemon.name] = pokemonObj;
        return pokemonObj;
    } catch (error) {
        console.error(`Error fetching details for ${pokemon.name}:`, error);
        return pokemon;
    }
}

async function fetchAllTypes() {
    try {
        const response = await fetch(`${API_BASE}/type`);
        const data = await response.json();
        types = data.results.map(t => t.name).sort();
    } catch (error) {
        console.error('Error fetching types:', error);
    }
}

// ===== Display Functions =====
function displayPokemon() {
    pokemonGrid.innerHTML = '';
    
    if (filteredPokemon.length === 0) {
        pokemonGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <div class="empty-state-title">Tidak ada hasil</div>
                    <div class="empty-state-description">Tidak menemukan Pokemon dengan kriteria yang Anda cari</div>
                </div>
            </div>
        `;
        return;
    }
    
    const pokemonToDisplay = filteredPokemon.slice(0, displayedCount);
    
    pokemonToDisplay.forEach(pokemon => {
        const card = createPokemonCard(pokemon);
        pokemonGrid.appendChild(card);
    });
    
    // Show/hide load more button
    if (displayedCount >= filteredPokemon.length) {
        loadMoreBtn.style.display = 'none';
    } else {
        loadMoreBtn.style.display = 'block';
    }
}

function createPokemonCard(pokemon) {
    const card = document.createElement('div');
    card.className = 'pokemon-card';
    
    const typesHTML = pokemon.types
        .map(type => `<span class="type-badge type-${type}">${type}</span>`)
        .join('');
    
    card.innerHTML = `
        <div class="pokemon-number">#${String(pokemon.id).padStart(4, '0')}</div>
        <img src="${pokemon.image}" alt="${pokemon.name}" class="pokemon-image" 
             onerror="this.src='https://via.placeholder.com/120?text=No+Image'">
        <h3 class="pokemon-name">${pokemon.name}</h3>
        <div class="pokemon-types">${typesHTML}</div>
    `;
    
    card.addEventListener('click', () => showPokemonModal(pokemon));
    
    return card;
}

function showPokemonModal(pokemon) {
    const statsHTML = pokemon.stats
        .map(stat => {
            const maxStat = 255;
            const percentage = (stat.base_stat / maxStat) * 100;
            return `
                <div class="stat-row">
                    <div class="stat-label">${formatStatName(stat.stat.name)}</div>
                    <div class="stat-bar">
                        <div class="stat-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="stat-value">${stat.base_stat}</div>
                </div>
            `;
        })
        .join('');
    
    const abilitiesHTML = pokemon.abilities
        .map(ability => `<div class="ability-badge">${ability}</div>`)
        .join('');
    
    const movesHTML = pokemon.moves
        .map(move => `<div class="move-badge">${move}</div>`)
        .join('');
    
    const typesHTML = pokemon.types
        .map(type => `<span class="type-badge type-${type}">${type}</span>`)
        .join('');
    
    modalBody.innerHTML = `
        <div class="modal-header">
            <img src="${pokemon.image}" alt="${pokemon.name}" class="modal-pokemon-image"
                 onerror="this.src='https://via.placeholder.com/200?text=No+Image'">
            <div class="modal-pokemon-name">${pokemon.name}</div>
            <div class="modal-pokemon-id">#${String(pokemon.id).padStart(4, '0')}</div>
        </div>
        
        <div class="modal-body">
            <div class="modal-section">
                <h3>Tipe</h3>
                <div class="pokemon-types">${typesHTML}</div>
            </div>
            
            <div class="modal-section">
                <h3>Informasi Dasar</h3>
                <div class="stat-row">
                    <div class="stat-label">Tinggi</div>
                    <div class="stat-value">${pokemon.height} m</div>
                </div>
                <div class="stat-row">
                    <div class="stat-label">Berat</div>
                    <div class="stat-value">${pokemon.weight} kg</div>
                </div>
                <div class="stat-row">
                    <div class="stat-label">Pengalaman Dasar</div>
                    <div class="stat-value">${pokemon.baseExperience || '-'}</div>
                </div>
            </div>
            
            <div class="modal-section">
                <h3>Statistik</h3>
                ${statsHTML}
            </div>
            
            <div class="modal-section">
                <h3>Kemampuan</h3>
                <div class="abilities-list">${abilitiesHTML || '<p>Tidak ada data</p>'}</div>
            </div>
            
            <div class="modal-section">
                <h3>Gerakan (5 Teratas)</h3>
                <div class="moves-list">${movesHTML || '<p>Tidak ada data</p>'}</div>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
}

function closeModal() {
    modal.classList.remove('show');
}

function populateTypeFilter() {
    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        typeFilter.appendChild(option);
    });
}

// ===== Handler Functions =====
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        filteredPokemon = [...allPokemon];
    } else {
        filteredPokemon = allPokemon.filter(pokemon => {
            return pokemon.name.includes(searchTerm) || 
                   String(pokemon.id).includes(searchTerm);
        });
    }
    
    displayedCount = POKEMON_PER_PAGE;
    displayPokemon();
}

function handleFilterChange() {
    const selectedType = typeFilter.value;
    
    filteredPokemon = allPokemon.filter(pokemon => {
        if (!selectedType) return true;
        return pokemon.types.includes(selectedType);
    });
    
    displayedCount = POKEMON_PER_PAGE;
    displayPokemon();
}

function handleSortChange() {
    const sortOption = sortSelect.value;
    
    if (sortOption === 'name-asc') {
        filteredPokemon.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === 'name-desc') {
        filteredPokemon.sort((a, b) => b.name.localeCompare(a.name));
    } else {
        filteredPokemon.sort((a, b) => a.id - b.id);
    }
    
    displayedCount = POKEMON_PER_PAGE;
    displayPokemon();
}

function loadMorePokemon() {
    displayedCount += POKEMON_PER_PAGE;
    displayPokemon();
    
    // Smooth scroll
    window.scrollBy({
        top: 300,
        behavior: 'smooth'
    });
}

// ===== Utility Functions =====
function formatStatName(stat) {
    const statNames = {
        'hp': 'HP',
        'attack': 'Serangan',
        'defense': 'Pertahanan',
        'special-attack': 'Serangan Khusus',
        'special-defense': 'Pertahanan Khusus',
        'speed': 'Kecepatan'
    };
    return statNames[stat] || stat;
}

// ===== Start Application =====
window.addEventListener('load', init);

// Handle visibility changes to refresh if needed
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && allPokemon.length === 0) {
        init();
    }
});

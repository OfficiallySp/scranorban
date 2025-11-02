// Storage keys
const STORAGE_KEY = 'scranOrBanData';

// State management
let currentFood = null;
let votingData = {
    items: {}, // { imageUrl: { scran: count, ban: count, lastVoted: timestamp } }
    history: [] // Array of vote objects
};

// DOM Elements
const foodImage = document.getElementById('foodImage');
const foodName = document.getElementById('foodName');
const loading = document.getElementById('loading');
const scranBtn = document.getElementById('scranBtn');
const banBtn = document.getElementById('banBtn');
const totalVotesEl = document.getElementById('totalVotes');
const scranCountEl = document.getElementById('scranCount');
const banCountEl = document.getElementById('banCount');
const scranPercentageEl = document.getElementById('scranPercentage');
const banPercentageEl = document.getElementById('banPercentage');
const uniqueItemsEl = document.getElementById('uniqueItems');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

// Initialize app
function init() {
    loadData();
    updateStats();
    renderHistory();
    loadNewFood();
    
    // Event listeners
    scranBtn.addEventListener('click', () => vote('scran'));
    banBtn.addEventListener('click', () => vote('ban'));
    clearHistoryBtn.addEventListener('click', clearHistory);
}

// Load data from localStorage
function loadData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            votingData = JSON.parse(stored);
        } catch (e) {
            console.error('Error loading data:', e);
            votingData = { items: {}, history: [] };
        }
    }
}

// Save data to localStorage
function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(votingData));
    } catch (e) {
        console.error('Error saving data:', e);
    }
}

// Food image sources with different quality levels
const foodSources = [
    {
        name: 'Foodish',
        url: 'https://foodish-api.com/api/',
        type: 'always-good',
        extract: (data) => ({
            imageUrl: data.image,
            name: extractFoodNameFromUrl(data.image)
        })
    },
    {
        name: 'TheMealDB',
        url: 'https://www.themealdb.com/api/json/v1/1/random.php',
        type: 'mixed',
        extract: (data) => ({
            imageUrl: data.meals[0].strMealThumb,
            name: data.meals[0].strMeal
        })
    },
    {
        name: 'Reddit-style Random Food',
        url: null, // Custom handler
        type: 'grotesque',
        custom: async () => {
            // Random "bad" food combinations and styles
            const badFoodIds = [
                '52819', // Bakewell tart (can look odd)
                '52795', // Jamaican patty
                '52944', // Escovitch fish
                '52940', // Brown stew chicken
                '52918', // Jamaican rice & peas
                '53013', // Corba (Turkish soup - can look unappetizing)
                '52855', // Chakchouka (looks messy)
                '52956', // Dum aloo (can look grotesque)
            ];
            const randomId = badFoodIds[Math.floor(Math.random() * badFoodIds.length)];
            const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${randomId}`);
            const data = await response.json();
            return {
                imageUrl: data.meals[0].strMealThumb,
                name: data.meals[0].strMeal + ' (might look weird)'
            };
        }
    },
    {
        name: 'Random Meal Category',
        url: null,
        type: 'mixed',
        custom: async () => {
            // Get random category then random meal from it
            const categories = ['Beef', 'Chicken', 'Dessert', 'Lamb', 'Miscellaneous', 
                              'Pasta', 'Pork', 'Seafood', 'Side', 'Starter', 
                              'Vegan', 'Vegetarian', 'Breakfast', 'Goat'];
            const randomCategory = categories[Math.floor(Math.random() * categories.length)];
            const response = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${randomCategory}`);
            const data = await response.json();
            const randomMeal = data.meals[Math.floor(Math.random() * data.meals.length)];
            return {
                imageUrl: randomMeal.strMealThumb,
                name: randomMeal.strMeal
            };
        }
    },
    {
        name: 'Strange Ingredients',
        url: null,
        type: 'grotesque',
        custom: async () => {
            // Foods with unusual ingredients that might look strange
            const weirdIngredients = ['Liver', 'Kidney Beans', 'Lamb', 'Goat', 'Offal'];
            const randomIngredient = weirdIngredients[Math.floor(Math.random() * weirdIngredients.length)];
            const response = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${randomIngredient}`);
            const data = await response.json();
            if (data.meals && data.meals.length > 0) {
                const randomMeal = data.meals[Math.floor(Math.random() * data.meals.length)];
                return {
                    imageUrl: randomMeal.strMealThumb,
                    name: randomMeal.strMeal + ' (strange ingredient)'
                };
            }
            // Fallback to random meal
            const fallback = await fetch('https://www.themealdb.com/api/json/v1/1/random.php');
            const fallbackData = await fallback.json();
            return {
                imageUrl: fallbackData.meals[0].strMealThumb,
                name: fallbackData.meals[0].strMeal
            };
        }
    }
];

// Extract food name from image URL
function extractFoodNameFromUrl(url) {
    try {
        // URL format: https://foodish-api.com/images/pizza/pizza1.jpg
        const pathParts = url.split('/');
        // Get the food category (second to last part)
        const foodCategory = pathParts[pathParts.length - 2];
        return foodCategory.replace(/-/g, ' ');
    } catch (e) {
        return 'Unknown Food';
    }
}

// Fetch random food image from various sources
async function loadNewFood() {
    try {
        loading.classList.remove('hidden');
        foodImage.classList.remove('loaded');
        foodName.textContent = '';
        
        // Randomly select a food source
        const randomSource = foodSources[Math.floor(Math.random() * foodSources.length)];
        console.log(`Loading food from: ${randomSource.name} (${randomSource.type})`);
        
        let foodData;
        
        // Handle custom sources
        if (randomSource.custom) {
            foodData = await randomSource.custom();
        } else {
            // Handle API-based sources
            const response = await fetch(randomSource.url);
            const data = await response.json();
            foodData = randomSource.extract(data);
        }
        
        if (foodData && foodData.imageUrl) {
            currentFood = {
                imageUrl: foodData.imageUrl,
                name: foodData.name,
                source: randomSource.name,
                timestamp: Date.now()
            };
            
            // Display food name with source indicator
            const sourceEmoji = randomSource.type === 'always-good' ? '✨' : 
                              randomSource.type === 'grotesque' ? '🤨' : '🎲';
            foodName.textContent = `${sourceEmoji} ${foodData.name}`;
            
            // Preload image
            const img = new Image();
            img.onload = () => {
                foodImage.src = foodData.imageUrl;
                foodImage.classList.add('loaded');
                loading.classList.add('hidden');
            };
            img.onerror = () => {
                console.error('Error loading image from', randomSource.name);
                loadNewFood(); // Try again with different source
            };
            img.src = foodData.imageUrl;
        }
    } catch (error) {
        console.error('Error fetching food:', error);
        loading.textContent = 'Error loading food. Retrying...';
        setTimeout(loadNewFood, 2000);
    }
}

// Handle vote
function vote(voteType) {
    if (!currentFood) return;
    
    const imageUrl = currentFood.imageUrl;
    
    // Initialize item data if it doesn't exist
    if (!votingData.items[imageUrl]) {
        votingData.items[imageUrl] = {
            scran: 0,
            ban: 0,
            firstSeen: Date.now()
        };
    }
    
    // Increment vote count
    votingData.items[imageUrl][voteType]++;
    votingData.items[imageUrl].lastVoted = Date.now();
    
    // Add to history
    votingData.history.unshift({
        imageUrl: imageUrl,
        name: currentFood.name,
        vote: voteType,
        timestamp: Date.now()
    });
    
    // Keep history to last 50 items
    if (votingData.history.length > 50) {
        votingData.history = votingData.history.slice(0, 50);
    }
    
    // Save data
    saveData();
    
    // Update UI
    updateStats();
    renderHistory();
    
    // Visual feedback
    const btn = voteType === 'scran' ? scranBtn : banBtn;
    btn.classList.add('voted');
    setTimeout(() => btn.classList.remove('voted'), 500);
    
    // Load next food after short delay
    setTimeout(loadNewFood, 600);
}

// Update statistics display
function updateStats() {
    // Calculate totals
    let totalScran = 0;
    let totalBan = 0;
    
    Object.values(votingData.items).forEach(item => {
        totalScran += item.scran;
        totalBan += item.ban;
    });
    
    const totalVotes = totalScran + totalBan;
    const uniqueItems = Object.keys(votingData.items).length;
    
    // Update DOM
    totalVotesEl.textContent = totalVotes;
    scranCountEl.textContent = totalScran;
    banCountEl.textContent = totalBan;
    uniqueItemsEl.textContent = uniqueItems;
    
    // Calculate percentages
    if (totalVotes > 0) {
        const scranPercent = Math.round((totalScran / totalVotes) * 100);
        const banPercent = Math.round((totalBan / totalVotes) * 100);
        scranPercentageEl.textContent = `${scranPercent}%`;
        banPercentageEl.textContent = `${banPercent}%`;
    } else {
        scranPercentageEl.textContent = '0%';
        banPercentageEl.textContent = '0%';
    }
}

// Render voting history
function renderHistory() {
    if (votingData.history.length === 0) {
        historyList.innerHTML = '<p class="no-history">No votes yet. Start voting!</p>';
        return;
    }
    
    historyList.innerHTML = votingData.history.map(item => {
        const date = new Date(item.timestamp);
        const timeString = formatTimeAgo(item.timestamp);
        const voteClass = item.vote === 'scran' ? 'scran' : 'ban';
        const voteText = item.vote === 'scran' ? '😋 SCRAN' : '🤢 BAN';
        const foodNameText = item.name || extractFoodNameFromUrl(item.imageUrl);
        
        return `
            <div class="history-item">
                <img class="history-thumbnail" src="${item.imageUrl}" alt="${foodNameText}" loading="lazy" />
                <div class="history-details">
                    <div class="history-food-name">${foodNameText}</div>
                    <div class="history-time">${timeString}</div>
                    <div class="history-date">${date.toLocaleString()}</div>
                </div>
                <div class="history-vote ${voteClass}">${voteText}</div>
            </div>
        `;
    }).join('');
}

// Format timestamp to human-readable "time ago"
function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'Just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
}

// Clear all history and data
function clearHistory() {
    if (confirm('Are you sure you want to clear all voting history and statistics? This cannot be undone.')) {
        votingData = {
            items: {},
            history: []
        };
        saveData();
        updateStats();
        renderHistory();
        alert('All data has been cleared!');
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        vote('ban');
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        vote('scran');
    }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}


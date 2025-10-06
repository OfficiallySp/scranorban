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

// Extract food name from image URL
function extractFoodName(url) {
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

// Fetch random food image from Foodish API
async function loadNewFood() {
    try {
        loading.classList.remove('hidden');
        foodImage.classList.remove('loaded');
        foodName.textContent = '';
        
        const response = await fetch('https://foodish-api.com/api/');
        const data = await response.json();
        
        if (data && data.image) {
            const name = extractFoodName(data.image);
            
            currentFood = {
                imageUrl: data.image,
                name: name,
                timestamp: Date.now()
            };
            
            // Display food name
            foodName.textContent = name;
            
            // Preload image
            const img = new Image();
            img.onload = () => {
                foodImage.src = data.image;
                foodImage.classList.add('loaded');
                loading.classList.add('hidden');
            };
            img.onerror = () => {
                console.error('Error loading image');
                loadNewFood(); // Try again
            };
            img.src = data.image;
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
        const foodNameText = item.name || extractFoodName(item.imageUrl);
        
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


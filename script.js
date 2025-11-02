const STORAGE_KEY = 'scranOrBanData';

let currentFood = null;
let votingData = {
    items: {},
    history: []
};

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

function init() {
    loadData();
    updateStats();
    renderHistory();
    loadNewFood();
    
    scranBtn.addEventListener('click', () => vote('scran'));
    banBtn.addEventListener('click', () => vote('ban'));
    clearHistoryBtn.addEventListener('click', clearHistory);
}

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

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(votingData));
    } catch (e) {
        console.error('Error saving data:', e);
    }
}

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
        name: 'TheMealDB Random',
        url: 'https://www.themealdb.com/api/json/v1/1/random.php',
        type: 'mixed',
        extract: (data) => ({
            imageUrl: data.meals[0].strMealThumb,
            name: data.meals[0].strMeal
        })
    },
    {
        name: 'TheMealDB Category',
        type: 'mixed',
        custom: async () => {
            const categories = ['Beef', 'Chicken', 'Dessert', 'Lamb', 'Miscellaneous', 
                              'Pasta', 'Pork', 'Seafood', 'Side', 'Starter', 
                              'Vegan', 'Vegetarian', 'Breakfast', 'Goat'];
            const category = categories[Math.floor(Math.random() * categories.length)];
            const response = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${category}`);
            const data = await response.json();
            const meal = data.meals[Math.floor(Math.random() * data.meals.length)];
            return {
                imageUrl: meal.strMealThumb,
                name: meal.strMeal
            };
        }
    },
    {
        name: 'TheMealDB Area',
        type: 'mixed',
        custom: async () => {
            const areas = ['American', 'British', 'Canadian', 'Chinese', 'Croatian', 
                         'Dutch', 'Egyptian', 'French', 'Greek', 'Indian', 
                         'Irish', 'Italian', 'Jamaican', 'Japanese', 'Kenyan',
                         'Malaysian', 'Mexican', 'Moroccan', 'Polish', 'Portuguese',
                         'Russian', 'Spanish', 'Thai', 'Tunisian', 'Turkish', 'Vietnamese'];
            const area = areas[Math.floor(Math.random() * areas.length)];
            const response = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${area}`);
            const data = await response.json();
            if (data.meals && data.meals.length > 0) {
                const meal = data.meals[Math.floor(Math.random() * data.meals.length)];
                return {
                    imageUrl: meal.strMealThumb,
                    name: `${meal.strMeal} (${area})`
                };
            }
            return await getRandomMealDB();
        }
    },
    {
        name: 'TheMealDB Ingredient',
        type: 'mixed',
        custom: async () => {
            const ingredients = ['Chicken', 'Beef', 'Pork', 'Fish', 'Rice', 'Pasta', 
                              'Potato', 'Cheese', 'Tomato', 'Egg', 'Bread', 'Onion'];
            const ingredient = ingredients[Math.floor(Math.random() * ingredients.length)];
            const response = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${ingredient}`);
            const data = await response.json();
            if (data.meals && data.meals.length > 0) {
                const meal = data.meals[Math.floor(Math.random() * data.meals.length)];
                return {
                    imageUrl: meal.strMealThumb,
                    name: meal.strMeal
                };
            }
            return await getRandomMealDB();
        }
    },
    {
        name: 'TheMealDB Desserts',
        type: 'always-good',
        custom: async () => {
            const response = await fetch('https://www.themealdb.com/api/json/v1/1/filter.php?c=Dessert');
            const data = await response.json();
            if (data.meals && data.meals.length > 0) {
                const meal = data.meals[Math.floor(Math.random() * data.meals.length)];
                return {
                    imageUrl: meal.strMealThumb,
                    name: meal.strMeal
                };
            }
            return await getRandomMealDB();
        }
    },
    {
        name: 'TheMealDB Breakfast',
        type: 'always-good',
        custom: async () => {
            const response = await fetch('https://www.themealdb.com/api/json/v1/1/filter.php?c=Breakfast');
            const data = await response.json();
            if (data.meals && data.meals.length > 0) {
                const meal = data.meals[Math.floor(Math.random() * data.meals.length)];
                return {
                    imageUrl: meal.strMealThumb,
                    name: meal.strMeal
                };
            }
            return await getRandomMealDB();
        }
    },
    {
        name: 'TheMealDB Seafood',
        type: 'mixed',
        custom: async () => {
            const response = await fetch('https://www.themealdb.com/api/json/v1/1/filter.php?c=Seafood');
            const data = await response.json();
            if (data.meals && data.meals.length > 0) {
                const meal = data.meals[Math.floor(Math.random() * data.meals.length)];
                return {
                    imageUrl: meal.strMealThumb,
                    name: meal.strMeal
                };
            }
            return await getRandomMealDB();
        }
    },
    {
        name: 'TheMealDB Vegetarian',
        type: 'mixed',
        custom: async () => {
            const response = await fetch('https://www.themealdb.com/api/json/v1/1/filter.php?c=Vegetarian');
            const data = await response.json();
            if (data.meals && data.meals.length > 0) {
                const meal = data.meals[Math.floor(Math.random() * data.meals.length)];
                return {
                    imageUrl: meal.strMealThumb,
                    name: meal.strMeal
                };
            }
            return await getRandomMealDB();
        }
    },
    {
        name: 'TheMealDB Pasta',
        type: 'mixed',
        custom: async () => {
            const response = await fetch('https://www.themealdb.com/api/json/v1/1/filter.php?c=Pasta');
            const data = await response.json();
            if (data.meals && data.meals.length > 0) {
                const meal = data.meals[Math.floor(Math.random() * data.meals.length)];
                return {
                    imageUrl: meal.strMealThumb,
                    name: meal.strMeal
                };
            }
            return await getRandomMealDB();
        }
    },
    {
        name: 'TheMealDB Unusual',
        type: 'grotesque',
        custom: async () => {
            const unusualIds = ['52819', '52795', '52944', '52940', '52918', 
                              '53013', '52855', '52956', '53027', '53026'];
            const id = unusualIds[Math.floor(Math.random() * unusualIds.length)];
            const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`);
            const data = await response.json();
            return {
                imageUrl: data.meals[0].strMealThumb,
                name: data.meals[0].strMeal
            };
        }
    }
];

async function getRandomMealDB() {
    const response = await fetch('https://www.themealdb.com/api/json/v1/1/random.php');
    const data = await response.json();
    return {
        imageUrl: data.meals[0].strMealThumb,
        name: data.meals[0].strMeal
    };
}

function extractFoodNameFromUrl(url) {
    try {
        const pathParts = url.split('/');
        const foodCategory = pathParts[pathParts.length - 2];
        return foodCategory.replace(/-/g, ' ');
    } catch (e) {
        return 'Unknown Food';
    }
}

async function loadNewFood() {
    try {
        loading.classList.remove('hidden');
        foodImage.classList.remove('loaded');
        foodName.textContent = '';
        
        const randomSource = foodSources[Math.floor(Math.random() * foodSources.length)];
        let foodData;
        
        if (randomSource.custom) {
            foodData = await randomSource.custom();
        } else {
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
            
            const emoji = randomSource.type === 'always-good' ? '✨' : 
                         randomSource.type === 'grotesque' ? '🤨' : '🎲';
            foodName.textContent = `${emoji} ${foodData.name}`;
            
            const img = new Image();
            img.onload = () => {
                foodImage.src = foodData.imageUrl;
                foodImage.classList.add('loaded');
                loading.classList.add('hidden');
            };
            img.onerror = () => {
                console.error('Error loading image from', randomSource.name);
                loadNewFood();
            };
            img.src = foodData.imageUrl;
        }
    } catch (error) {
        console.error('Error fetching food:', error);
        loading.textContent = 'Error loading food. Retrying...';
        setTimeout(loadNewFood, 2000);
    }
}

function vote(voteType) {
    if (!currentFood) return;
    
    const imageUrl = currentFood.imageUrl;
    
    if (!votingData.items[imageUrl]) {
        votingData.items[imageUrl] = {
            scran: 0,
            ban: 0,
            firstSeen: Date.now()
        };
    }
    
    votingData.items[imageUrl][voteType]++;
    votingData.items[imageUrl].lastVoted = Date.now();
    
    votingData.history.unshift({
        imageUrl: imageUrl,
        name: currentFood.name,
        vote: voteType,
        timestamp: Date.now()
    });
    
    if (votingData.history.length > 50) {
        votingData.history = votingData.history.slice(0, 50);
    }
    
    saveData();
    updateStats();
    renderHistory();
    
    const btn = voteType === 'scran' ? scranBtn : banBtn;
    btn.classList.add('voted');
    setTimeout(() => btn.classList.remove('voted'), 500);
    
    setTimeout(loadNewFood, 600);
}

function updateStats() {
    let totalScran = 0;
    let totalBan = 0;
    
    Object.values(votingData.items).forEach(item => {
        totalScran += item.scran;
        totalBan += item.ban;
    });
    
    const totalVotes = totalScran + totalBan;
    const uniqueItems = Object.keys(votingData.items).length;
    
    totalVotesEl.textContent = totalVotes;
    scranCountEl.textContent = totalScran;
    banCountEl.textContent = totalBan;
    uniqueItemsEl.textContent = uniqueItems;
    
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

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        vote('ban');
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        vote('scran');
    }
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}


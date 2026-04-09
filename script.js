// CryptoHub - Real-time cryptocurrency data with backend API
document.addEventListener('DOMContentLoaded', function() {
  // Coin data mapping
  const coins = [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', icon: '₿' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', icon: 'Ξ' },
    { id: 'solana', symbol: 'SOL', name: 'Solana', icon: '🔸' },
    { id: 'cardano', symbol: 'ADA', name: 'Cardano', icon: 'A' },
    { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', icon: '●' },
    { id: 'ripple', symbol: 'XRP', name: 'Ripple', icon: '✕' },
    { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', icon: 'Ð' },
    { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', icon: '❄' }
  ];

  // Backend API configuration
  const BACKEND_API = 'http://localhost:3001';
  
  // DOM Elements
  let lastUpdatedEl = null;
  
  // Initialize
  init();
  
  function init() {
    // Create last updated element if it doesn't exist
    const coinsSubtitle = document.querySelector('.coins-subtitle');
    if (coinsSubtitle && !document.querySelector('.last-updated')) {
      const lastUpdated = document.createElement('span');
      lastUpdated.className = 'last-updated';
      lastUpdated.textContent = 'Loading data...';
      coinsSubtitle.appendChild(document.createTextNode(' • '));
      coinsSubtitle.appendChild(lastUpdated);
      lastUpdatedEl = lastUpdated;
    } else {
      lastUpdatedEl = document.querySelector('.last-updated');
    }
    
    // Fetch initial data
    fetchAllData();
    
    // Set up periodic refresh
    setInterval(fetchAllData, 60000); // Every minute
  }
  
  // Fetch all data from backend
  async function fetchAllData() {
    await Promise.all([
      fetchCryptoData(),
      fetchCryptoNews(),
      fetchMarketStats()
    ]);
  }
  
  // Fetch cryptocurrency prices
  async function fetchCryptoData() {
    try {
      const ids = coins.map(c => c.id).join(',');
      const response = await fetch(
        `${BACKEND_API}/api/crypto-prices?ids=${ids}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch data from backend');
      
      const result = await response.json();
      
      if (result.success && result.data) {
        updateTicker(result.data);
        updateCoinCards(result.data);
        updateLastUpdated(result.timestamp);
      } else {
        throw new Error(result.error || 'Invalid response from backend');
      }
    } catch (error) {
      console.error('Error fetching cryptocurrency data:', error);
      // Fallback: Try direct CoinGecko API if backend fails
      fetchFallbackData();
    }
  }
  
  // Fallback: Direct CoinGecko API (for development without backend)
  async function fetchFallbackData() {
    try {
      const ids = coins.map(c => c.id).join(',');
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
      );
      
      if (!response.ok) throw new Error('Failed to fetch fallback data');
      
      const data = await response.json();
      updateTicker(data);
      updateCoinCards(data);
      updateLastUpdated(new Date().toISOString());
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      // Keep existing mock data as last resort
    }
  }
  
  // Fetch cryptocurrency news
  async function fetchCryptoNews() {
    try {
      const response = await fetch(`${BACKEND_API}/api/crypto-news`);
      
      if (!response.ok) {
        // If endpoint not implemented, use mock news
        console.log('News endpoint not available, using sample data');
        return;
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        updateNewsFeed(result.data);
      }
    } catch (error) {
      console.error('Error fetching cryptocurrency news:', error);
      // Use sample news data as fallback
      displaySampleNews();
    }
  }
  
  // Fetch market statistics
  async function fetchMarketStats() {
    try {
      const response = await fetch(`${BACKEND_API}/api/market-stats`);
      
      if (!response.ok) {
        console.log('Market stats endpoint not available');
        return;
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        updateMarketStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching market stats:', error);
    }
  }
  
  // Update market statistics display
  function updateMarketStats(data) {
    // Format large numbers
    const formatBillions = (value) => {
      if (value >= 1000000000000) {
        return `$${(value / 1000000000000).toFixed(2)}T`;
      } else if (value >= 1000000000) {
        return `$${(value / 1000000000).toFixed(2)}B`;
      } else {
        return `$${value.toLocaleString()}`;
      }
    };
    
    // Update DOM elements if they exist
    const totalMarketCapEl = document.getElementById('total-market-cap');
    const btcDominanceEl = document.getElementById('btc-dominance');
    const volume24hEl = document.getElementById('24h-volume');
    const activeCryptosEl = document.getElementById('active-cryptos');
    
    if (totalMarketCapEl && data.total_market_cap) {
      totalMarketCapEl.textContent = formatBillions(data.total_market_cap);
    }
    
    if (btcDominanceEl && data.market_cap_percentage && data.market_cap_percentage.btc) {
      btcDominanceEl.textContent = `${data.market_cap_percentage.btc.toFixed(1)}%`;
    }
    
    if (volume24hEl && data.total_volume) {
      volume24hEl.textContent = formatBillions(data.total_volume);
    }
    
    if (activeCryptosEl && data.active_cryptocurrencies) {
      activeCryptosEl.textContent = data.active_cryptocurrencies.toLocaleString();
    }
  }
  
  // Update the ticker at the top
  function updateTicker(data) {
    const tickerTrack = document.querySelector('.ticker-track');
    if (!tickerTrack) return;

    // Clear existing items (keep the structure for animation)
    tickerTrack.innerHTML = '';
    
    coins.forEach(coin => {
      const coinData = data[coin.id];
      if (!coinData) return;
      
      const price = coinData.usd.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).replace('$', '');
      
      const change = coinData.usd_24h_change;
      const changeClass = change >= 0 ? 'up' : 'down';
      const changeSign = change >= 0 ? '+' : '';
      
      const tickerItem = document.createElement('div');
      tickerItem.className = 'ticker-item';
      tickerItem.innerHTML = `
        <strong>${coin.symbol}</strong> $${price} 
        <span class="change ${changeClass}">${changeSign}${change.toFixed(1)}%</span>
      `;
      tickerTrack.appendChild(tickerItem);
    });
  }
  
  // Update the coin cards
  function updateCoinCards(data) {
    const coinCards = document.querySelectorAll('.coin-card');
    
    coinCards.forEach((card, index) => {
      if (index >= coins.length) return;
      const coin = coins[index];
      const coinData = data[coin.id];
      if (!coinData) return;
      
      const price = coinData.usd.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      
      const change = coinData.usd_24h_change;
      const changeClass = change >= 0 ? 'up' : 'down';
      const changeSign = change >= 0 ? '+' : '';
      
      // Update card content
      const iconEl = card.querySelector('.coin-icon');
      const symbolEl = card.querySelector('.coin-symbol');
      const priceEl = card.querySelector('.coin-price');
      const changeEl = card.querySelector('.change');
      
      if (iconEl) iconEl.textContent = coin.icon;
      if (symbolEl) symbolEl.textContent = coin.symbol;
      if (priceEl) priceEl.textContent = price;
      if (changeEl) {
        changeEl.textContent = `${changeSign}${change.toFixed(1)}%`;
        changeEl.className = `change ${changeClass}`;
      }
    });
  }
  
  // Update last updated timestamp
  function updateLastUpdated(timestamp) {
    if (!lastUpdatedEl) return;
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    let timeText;
    if (diffMins < 1) {
      timeText = 'Just now';
    } else if (diffMins === 1) {
      timeText = '1 minute ago';
    } else if (diffMins < 60) {
      timeText = `${diffMins} minutes ago`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      timeText = `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    }
    
    lastUpdatedEl.textContent = `Updated ${timeText}`;
  }
  
  // Update news feed with real data
  function updateNewsFeed(newsData) {
    // This function would parse the news data from Firecrawl/Apify
    // For now, we'll keep the sample data
    console.log('News data received:', newsData);
  }
  
  // Display sample news (fallback)
  function displaySampleNews() {
    // Sample news articles - in a real app, these would come from the API
    const sampleNews = [
      {
        source: 'CoinTelegraph',
        title: 'Bitcoin ETFs See Record Inflows',
        excerpt: 'Spot Bitcoin ETFs continue to attract institutional investors with record daily inflows surpassing $1.2 billion.',
        time: '2 hours ago',
        url: 'https://cointelegraph.com/'
      },
      {
        source: 'Decrypt',
        title: 'Ethereum Layer 2 Solutions Grow',
        excerpt: 'Total value locked in Ethereum Layer 2 solutions reaches new all-time high as scaling solutions gain adoption.',
        time: '5 hours ago',
        url: 'https://decrypt.co/'
      },
      {
        source: 'CryptoSlate',
        title: 'Regulatory Developments in Europe',
        excerpt: 'European Union finalizes MiCA regulations, providing clearer framework for cryptocurrency businesses.',
        time: '1 day ago',
        url: 'https://cryptoslate.com/'
      }
    ];
    
    const newsGrid = document.querySelector('.news-grid');
    if (!newsGrid) return;
    
    // Clear existing news cards (keep the first 3 as template)
    const existingCards = newsGrid.querySelectorAll('.news-card');
    if (existingCards.length > 0) {
      // Update the existing cards with sample data
      existingCards.forEach((card, index) => {
        if (index < sampleNews.length) {
          const news = sampleNews[index];
          const sourceEl = card.querySelector('.news-source');
          const titleEl = card.querySelector('h3');
          const excerptEl = card.querySelector('.news-excerpt');
          const timeEl = card.querySelector('.news-time');
          const linkEl = card.querySelector('.news-link');
          
          if (sourceEl) sourceEl.textContent = news.source;
          if (titleEl) titleEl.textContent = news.title;
          if (excerptEl) excerptEl.textContent = news.excerpt;
          if (timeEl) timeEl.textContent = news.time;
          if (linkEl) linkEl.href = news.url;
        }
      });
    }
  }
  
  // Add loading states
  function showLoading() {
    // Could add loading spinners to ticker and cards
    const tickerTrack = document.querySelector('.ticker-track');
    if (tickerTrack) {
      tickerTrack.innerHTML = '<div class="ticker-item">Loading cryptocurrency data...</div>';
    }
    
    if (lastUpdatedEl) {
      lastUpdatedEl.textContent = 'Updating...';
    }
  }
});
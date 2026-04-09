// backend/server.js - Enhanced API server for CryptoHub with real data integrations
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_in_production';
const USERS_FILE = path.join(__dirname, 'users.json');

// Middleware
app.use(cors());
app.use(express.json());

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// API configurations
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev/v1';

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_BASE_URL = 'https://api.apify.com/v2';

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

// Sample news data (fallback when APIs fail or aren't configured)
const SAMPLE_NEWS = [
  {
    id: 1,
    source: 'CoinTelegraph',
    title: 'Bitcoin ETFs See Record $1.2B Daily Inflows',
    excerpt: 'Spot Bitcoin ETFs attracted record inflows this week as institutional interest continues to grow.',
    url: 'https://cointelegraph.com/',
    timeAgo: '2 hours ago',
    category: 'Bitcoin'
  },
  {
    id: 2,
    source: 'Decrypt',
    title: 'Ethereum Layer 2 TVL Hits All-Time High',
    excerpt: 'Total value locked in Ethereum Layer 2 scaling solutions surpasses $40 billion.',
    url: 'https://decrypt.co/',
    timeAgo: '5 hours ago',
    category: 'Ethereum'
  },
  {
    id: 3,
    source: 'CryptoSlate',
    title: 'EU Finalizes MiCA Crypto Regulations',
    excerpt: 'The European Union has finalized its Markets in Crypto-Assets regulation framework.',
    url: 'https://cryptoslate.com/',
    timeAgo: '1 day ago',
    category: 'Regulation'
  },
  {
    id: 4,
    source: 'The Block',
    title: 'Solana Network Activity Surges 300%',
    excerpt: 'Daily active addresses on Solana reach record highs amid memecoin trading frenzy.',
    url: 'https://www.theblock.co/',
    timeAgo: '3 hours ago',
    category: 'Solana'
  },
  {
    id: 5,
    source: 'CoinDesk',
    title: 'Crypto Venture Funding Rebounds in Q1',
    excerpt: 'Venture capital investment in crypto startups shows signs of recovery after two-year decline.',
    url: 'https://www.coindesk.com/',
    timeAgo: '1 day ago',
    category: 'Investing'
  },
  {
    id: 6,
    source: 'Bloomberg Crypto',
    title: 'BlackRock Files for Ethereum ETF',
    excerpt: 'BlackRock has filed for a spot Ethereum ETF with the U.S. Securities and Exchange Commission.',
    url: 'https://www.bloomberg.com/crypto',
    timeAgo: '4 hours ago',
    category: 'ETF'
  }
];

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'CryptoHub API Server',
    version: '1.0.0',
    endpoints: {
      cryptoPrices: '/api/crypto-prices',
      cryptoNews: '/api/crypto-news',
      marketStats: '/api/market-stats',
      auth: {
        register: '/api/auth/register',
        login: '/api/auth/login',
        me: '/api/auth/me',
        portfolio: '/api/user/portfolio'
      },
      health: '/health'
    },
    services: {
      firecrawl: FIRECRAWL_API_KEY ? 'configured' : 'not configured',
      apify: APIFY_API_TOKEN ? 'configured' : 'not configured',
      coingecko: 'available',
      auth: 'available'
    }
  });
});

// Get cryptocurrency prices (using CoinGecko with caching)
app.get('/api/crypto-prices', async (req, res) => {
  try {
    const { ids = 'bitcoin,ethereum,solana,cardano,polkadot,ripple,dogecoin,avalanche-2' } = req.query;
    
    // Use CoinGecko API for real prices
    const response = await axios.get(
      `${COINGECKO_BASE_URL}/simple/price`,
      {
        params: {
          ids,
          vs_currencies: 'usd',
          include_24hr_change: true,
          include_market_cap: true,
          include_24hr_vol: true
        },
        timeout: 10000 // 10 second timeout
      }
    );
    
    // Add metadata to each coin
    const coins = ids.split(',');
    const enhancedData = {};
    
    coins.forEach(coinId => {
      if (response.data[coinId]) {
        enhancedData[coinId] = {
          ...response.data[coinId],
          // Add calculated fields
          market_cap_rank: getMarketCapRank(coinId),
          last_updated: new Date().toISOString()
        };
      }
    });
    
    res.json({
      success: true,
      data: enhancedData,
      timestamp: new Date().toISOString(),
      source: 'coingecko'
    });
  } catch (error) {
    console.error('Error fetching crypto prices:', error.message);
    
    // Fallback to mock data
    const mockData = generateMockPriceData();
    res.json({
      success: true,
      data: mockData,
      timestamp: new Date().toISOString(),
      source: 'mock',
      note: 'Using mock data due to API failure'
    });
  }
});

// Get cryptocurrency news (using Firecrawl with fallback)
app.get('/api/crypto-news', async (req, res) => {
  // Try Firecrawl if configured
  if (FIRECRAWL_API_KEY) {
    try {
      // Try to scrape a crypto news site
      const response = await axios.post(
        `${FIRECRAWL_BASE_URL}/scrape`,
        {
          url: 'https://cointelegraph.com/latest-news',
          formats: ['markdown'],
          onlyMainContent: true
        },
        {
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );
      
      // Process Firecrawl response into structured news
      const processedNews = processFirecrawlNews(response.data);
      
      return res.json({
        success: true,
        data: processedNews.length > 0 ? processedNews : SAMPLE_NEWS,
        timestamp: new Date().toISOString(),
        source: 'firecrawl'
      });
    } catch (error) {
      console.error('Firecrawl API error:', error.message);
      // Continue to fallback
    }
  }
  
  // Fallback: Try Apify if configured
  if (APIFY_API_TOKEN) {
    try {
      // Example: Use Apify's web scraper for news
      const response = await axios.get(
        `${APIFY_BASE_URL}/acts/apify~web-scraper/runs/last/dataset/items`,
        {
          params: {
            token: APIFY_API_TOKEN,
            format: 'json'
          },
          timeout: 15000
        }
      );
      
      if (response.data && response.data.length > 0) {
        const processedNews = processApifyNews(response.data);
        
        return res.json({
          success: true,
          data: processedNews.length > 0 ? processedNews : SAMPLE_NEWS,
          timestamp: new Date().toISOString(),
          source: 'apify'
        });
      }
    } catch (error) {
      console.error('Apify API error:', error.message);
      // Continue to fallback
    }
  }
  
  // Final fallback: Sample data
  res.json({
    success: true,
    data: SAMPLE_NEWS,
    timestamp: new Date().toISOString(),
    source: 'sample',
    note: 'Using sample data (configure Firecrawl or Apify for real news)'
  });
});

// Get market statistics
app.get('/api/market-stats', async (req, res) => {
  try {
    // Get global market data from CoinGecko
    const response = await axios.get(
      `${COINGECKO_BASE_URL}/global`,
      {
        timeout: 10000
      }
    );
    
    const globalData = response.data.data;
    
    res.json({
      success: true,
      data: {
        total_market_cap: globalData.total_market_cap.usd,
        total_volume: globalData.total_volume.usd,
        market_cap_percentage: globalData.market_cap_percentage,
        active_cryptocurrencies: globalData.active_cryptocurrencies,
        upcoming_icos: globalData.upcoming_icos,
        ongoing_icos: globalData.ongoing_icos,
        ended_icos: globalData.ended_icos,
        markets: globalData.markets,
        last_updated: new Date(globalData.updated_at).toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching market stats:', error.message);
    
    // Mock market data
    res.json({
      success: true,
      data: {
        total_market_cap: 2650000000000,
        total_volume: 85000000000,
        market_cap_percentage: {
          btc: 52.8,
          eth: 16.2,
          usdt: 4.1,
          bnb: 2.8,
          sol: 2.3
        },
        active_cryptocurrencies: 13980,
        markets: 850,
        last_updated: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      source: 'mock'
    });
  }
});



// Authentication endpoints

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    // Validate input
    if (!username || !password || !email) {
      return res.status(400).json({ success: false, error: 'Username, password, and email are required' });
    }
    
    // Check if user already exists
    const usersData = await fs.readFile(USERS_FILE, 'utf8');
    const users = JSON.parse(usersData);
    
    if (users.find(u => u.username === username)) {
      return res.status(400).json({ success: false, error: 'Username already exists' });
    }
    
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = {
      id: Date.now().toString(),
      username,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      portfolio: [] // Empty portfolio for now
    };
    
    users.push(newUser);
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    
    // Create JWT token
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }
    
    // Read users
    const usersData = await fs.readFile(USERS_FILE, 'utf8');
    const users = JSON.parse(usersData);
    
    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    // Create JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get current user (protected)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    // Read users to get full user data
    const usersData = await fs.readFile(USERS_FILE, 'utf8');
    const users = JSON.parse(usersData);
    const user = users.find(u => u.id === req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        portfolio: user.portfolio || []
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Example protected endpoint: User portfolio
app.get('/api/user/portfolio', authenticateToken, async (req, res) => {
  try {
    // Read users to get portfolio
    const usersData = await fs.readFile(USERS_FILE, 'utf8');
    const users = JSON.parse(usersData);
    const user = users.find(u => u.id === req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({
      success: true,
      portfolio: user.portfolio || []
    });
  } catch (error) {
    console.error('Portfolio error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Update portfolio (example of protected POST)
app.post('/api/user/portfolio', authenticateToken, async (req, res) => {
  try {
    const { coinId, amount, action } = req.body; // action: 'buy' or 'sell'
    
    // Validate input
    if (!coinId || !amount || !action) {
      return res.status(400).json({ success: false, error: 'Coin ID, amount, and action are required' });
    }
    
    // Read users
    const usersData = await fs.readFile(USERS_FILE, 'utf8');
    const users = JSON.parse(usersData);
    const userIndex = users.findIndex(u => u.id === req.user.id);
    
    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Initialize portfolio if not exists
    if (!users[userIndex].portfolio) {
      users[userIndex].portfolio = [];
    }
    
    // Simple portfolio update logic
    const portfolioItem = users[userIndex].portfolio.find(item => item.coinId === coinId);
    if (portfolioItem) {
      if (action === 'buy') {
        portfolioItem.amount += parseFloat(amount);
      } else if (action === 'sell') {
        portfolioItem.amount -= parseFloat(amount);
        if (portfolioItem.amount < 0) portfolioItem.amount = 0;
      }
    } else {
      if (action === 'buy') {
        users[userIndex].portfolio.push({
          coinId,
          amount: parseFloat(amount),
          addedAt: new Date().toISOString()
        });
      }
      // If selling a coin not in portfolio, ignore or error
    }
    
    // Save updated users
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    
    res.json({
      success: true,
      message: 'Portfolio updated successfully',
      portfolio: users[userIndex].portfolio
    });
  } catch (error) {
    console.error('Update portfolio error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      firecrawl: FIRECRAWL_API_KEY ? 'configured' : 'not configured',
      apify: APIFY_API_TOKEN ? 'configured' : 'not configured',
      coingecko: 'available'
    }
  });
});

// Helper functions

function getMarketCapRank(coinId) {
  // Simplified market cap ranks
  const ranks = {
    'bitcoin': 1,
    'ethereum': 2,
    'tether': 3,
    'bnb': 4,
    'solana': 5,
    'usd-coin': 6,
    'xrp': 7,
    'cardano': 8,
    'dogecoin': 9,
    'avalanche-2': 10
  };
  return ranks[coinId] || 99;
}

function generateMockPriceData() {
  // Generate realistic-looking mock price data
  const coins = {
    'bitcoin': { usd: 68423.15, usd_24h_change: 2.3, usd_market_cap: 1345000000000, usd_24h_vol: 32000000000 },
    'ethereum': { usd: 3812.47, usd_24h_change: 1.8, usd_market_cap: 458000000000, usd_24h_vol: 18000000000 },
    'solana': { usd: 142.89, usd_24h_change: -0.5, usd_market_cap: 63000000000, usd_24h_vol: 3500000000 },
    'cardano': { usd: 0.52, usd_24h_change: 3.1, usd_market_cap: 18500000000, usd_24h_vol: 650000000 },
    'polkadot': { usd: 7.21, usd_24h_change: 1.2, usd_market_cap: 9200000000, usd_24h_vol: 280000000 },
    'ripple': { usd: 0.62, usd_24h_change: -0.8, usd_market_cap: 34000000000, usd_24h_vol: 1200000000 },
    'dogecoin': { usd: 0.15, usd_24h_change: 5.7, usd_market_cap: 21500000000, usd_24h_vol: 1800000000 },
    'avalanche-2': { usd: 36.45, usd_24h_change: 2.9, usd_market_cap: 13800000000, usd_24h_vol: 520000000 }
  };
  
  // Add some random variation to make it look live
  const now = Date.now();
  Object.keys(coins).forEach(coinId => {
    const coin = coins[coinId];
    // Small random fluctuation based on timestamp
    const fluctuation = Math.sin(now / 60000 + coinId.length) * 0.1;
    coin.usd_24h_change = parseFloat((coin.usd_24h_change + fluctuation).toFixed(1));
    coin.usd = parseFloat((coin.usd * (1 + fluctuation / 100)).toFixed(2));
  });
  
  return coins;
}

function processFirecrawlNews(firecrawlData) {
  // Process Firecrawl response into structured news format
  // This is a simplified implementation
  try {
    if (firecrawlData.markdown) {
      // Parse markdown to extract articles
      const lines = firecrawlData.markdown.split('\n');
      const articles = [];
      let currentArticle = null;
      
      for (let i = 0; i < lines.length && articles.length < 6; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('## ') || line.startsWith('### ')) {
          if (currentArticle) {
            articles.push(currentArticle);
          }
          currentArticle = {
            title: line.replace(/^#+\s/, ''),
            excerpt: '',
            source: 'CoinTelegraph',
            url: 'https://cointelegraph.com/',
            timeAgo: 'Recently'
          };
        } else if (currentArticle && line && !currentArticle.excerpt) {
          currentArticle.excerpt = line.substring(0, 150) + '...';
        }
      }
      
      if (currentArticle && articles.length < 6) {
        articles.push(currentArticle);
      }
      
      return articles.map((article, index) => ({
        id: index + 1,
        ...article
      }));
    }
  } catch (error) {
    console.error('Error processing Firecrawl news:', error);
  }
  
  return [];
}

function processApifyNews(apifyData) {
  // Process Apify response into structured news format
  try {
    if (Array.isArray(apifyData)) {
      return apifyData.slice(0, 6).map((item, index) => ({
        id: index + 1,
        source: item.source || 'News Source',
        title: item.title || 'Cryptocurrency News',
        excerpt: item.description ? item.description.substring(0, 120) + '...' : 'Latest cryptocurrency news and updates.',
        url: item.url || '#',
        timeAgo: item.published ? formatTimeAgo(item.published) : 'Recently',
        category: item.category || 'General'
      }));
    }
  } catch (error) {
    console.error('Error processing Apify news:', error);
  }
  
  return [];
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CryptoHub API server running on port ${PORT}`);
  console.log(`🔗 API available at http://localhost:${PORT}`);
  console.log('\n📊 Available endpoints:');
  console.log(`   GET / - API information`);
  console.log(`   GET /api/crypto-prices - Real-time cryptocurrency prices`);
  console.log(`   GET /api/crypto-news - Latest cryptocurrency news`);
  console.log(`   GET /api/market-stats - Global market statistics`);
  console.log(`   GET /health - Health check`);
  console.log('\n🔧 API Integrations:');
  console.log(`   CoinGecko: ${FIRECRAWL_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   Firecrawl: ${APIFY_API_TOKEN ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   Apify: ${APIFY_API_TOKEN ? '✅ Configured' : '❌ Not configured'}`);
});
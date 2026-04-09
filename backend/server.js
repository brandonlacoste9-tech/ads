// backend/server.js - Example API server for CryptoHub
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Firecrawl API configuration
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev/v1';

// Apify API configuration
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_BASE_URL = 'https://api.apify.com/v2';

// CoinGecko API (free tier)
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'CryptoHub API Server',
    endpoints: {
      cryptoPrices: '/api/crypto-prices',
      cryptoNews: '/api/crypto-news',
      exchangeData: '/api/exchange-data'
    },
    status: 'running'
  });
});

// Example: Get cryptocurrency prices (using CoinGecko)
app.get('/api/crypto-prices', async (req, res) => {
  try {
    const { ids = 'bitcoin,ethereum,solana,cardano' } = req.query;
    
    const response = await axios.get(
      `${COINGECKO_BASE_URL}/simple/price`,
      {
        params: {
          ids,
          vs_currencies: 'usd',
          include_24hr_change: true
        }
      }
    );
    
    res.json({
      success: true,
      data: response.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching crypto prices:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cryptocurrency prices'
    });
  }
});

// Example: Get cryptocurrency news (using Firecrawl)
app.get('/api/crypto-news', async (req, res) => {
  if (!FIRECRAWL_API_KEY) {
    return res.status(400).json({
      success: false,
      error: 'Firecrawl API key not configured'
    });
  }

  try {
    // This is an example - you'd need to set up Firecrawl properly
    const response = await axios.post(
      `${FIRECRAWL_BASE_URL}/scrape`,
      {
        url: 'https://cointelegraph.com/',
        formats: ['markdown']
      },
      {
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      success: true,
      data: response.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching crypto news:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cryptocurrency news'
    });
  }
});

// Example: Get exchange data (using Apify)
app.get('/api/exchange-data', async (req, res) => {
  if (!APIFY_API_TOKEN) {
    return res.status(400).json({
      success: false,
      error: 'Apify API token not configured'
    });
  }

  try {
    // Example: Run a pre-existing Apify actor for cryptocurrency data
    const response = await axios.post(
      `${APIFY_BASE_URL}/acts/apify~crypto-scraper/run-sync-get-dataset-items`,
      {
        // Actor configuration
      },
      {
        params: {
          token: APIFY_API_TOKEN,
          format: 'json'
        }
      }
    );

    res.json({
      success: true,
      data: response.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching exchange data:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch exchange data'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      firecrawl: FIRECRAWL_API_KEY ? 'configured' : 'not configured',
      apify: APIFY_API_TOKEN ? 'configured' : 'not configured',
      coingecko: 'available'
    }
  });
});

app.listen(PORT, () => {
  console.log(`CryptoHub API server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log(`  GET / - API information`);
  console.log(`  GET /api/crypto-prices - Cryptocurrency prices (CoinGecko)`);
  console.log(`  GET /api/crypto-news - Cryptocurrency news (Firecrawl)`);
  console.log(`  GET /api/exchange-data - Exchange data (Apify)`);
  console.log(`  GET /health - Health check`);
});
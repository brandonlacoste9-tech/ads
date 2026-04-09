const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
let content = fs.readFileSync(serverPath, 'utf8');

// Update root endpoint
const oldRoot = `app.get('/', (req, res) => {
  res.json({
    message: 'CryptoHub API Server',
    version: '1.0.0',
    endpoints: {
      cryptoPrices: '/api/crypto-prices',
      cryptoNews: '/api/crypto-news',
      marketStats: '/api/market-stats',
      health: '/health'
    },
    services: {
      firecrawl: FIRECRAWL_API_KEY ? 'configured' : 'not configured',
      apify: APIFY_API_TOKEN ? 'configured' : 'not configured',
      coingecko: 'available'
    }
  });
});`;

const newRoot = `app.get('/', (req, res) => {
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
});`;

content = content.replace(oldRoot, newRoot);

// Insert auth routes before health endpoint
const authRoutes = `

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
`;

// Find the position of health endpoint and insert before it
const healthEndpointIndex = content.indexOf('// Health check endpoint');
if (healthEndpointIndex !== -1) {
  content = content.slice(0, healthEndpointIndex) + authRoutes + content.slice(healthEndpointIndex);
} else {
  console.error('Could not find health endpoint');
  process.exit(1);
}

fs.writeFileSync(serverPath, content);
console.log('✅ Authentication routes added to server.js');
console.log('✅ Root endpoint updated');
console.log('🚀 Restart the server to apply changes');
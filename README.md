# CryptoHub

A modern cryptocurrency exchange landing page with dark theme and neon accents.

## Features

- Modern, responsive design with dark theme and purple/cyan neon accents
- Clean, accessible HTML5 and CSS3
- Animated price ticker with mock cryptocurrency data
- Interactive cryptocurrency cards with price changes
- Fast and lightweight (no JavaScript framework)
- Live reload development server
- Environment configuration for API keys (Firecrawl, CoinGecko)

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm (or yarn/pnpm)

### Installation

```bash
npm install
```

Copy the environment variables template:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
- `FIRECRAWL_API_KEY`: Your Firecrawl API key for web scraping cryptocurrency news/data
- `APIFY_API_TOKEN`: Your Apify API token for web scraping and automation tasks
- `COINGECKO_API_KEY`: Optional CoinGecko API key for real-time cryptocurrency prices

### Development

Start the live-reload development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

The server will automatically reload when you change `index.html` or `style.css`.

### Backend API Server (Optional)

If you want to use the API integrations (Firecrawl, Apify, CoinGecko), you can run the example backend server:

```bash
# Install backend dependencies
npm run install-all

# Start the backend server (runs on port 3001)
npm run backend-dev

# In another terminal, start the frontend
npm run dev
```

The backend provides secure API endpoints that your frontend can call to access cryptocurrency data without exposing API keys in the browser.

### Building

This is a static site; there's no build step. Simply deploy the `index.html` and `style.css` files to any web server.

## Project Structure

### Frontend Files
- `index.html` – Main HTML document
- `style.css` – All styles
- `script.js` – JavaScript for real-time cryptocurrency data
- `package.json` – Development dependencies and scripts
- `.env.example` – Environment variables template
- `LICENSE` – Apache 2.0 license

### Backend Files (optional)
- `backend/server.js` – Example Express.js API server
- `backend/package.json` – Backend dependencies

### Environment Configuration
- `.env` – API keys and environment variables (never commit to version control)

## API Integrations

This project includes configuration for multiple API integrations:

### Firecrawl API
Firecrawl can be used to:
- Scrape cryptocurrency news from various sources
- Extract real-time price data from exchange websites
- Gather market sentiment analysis from social media

### Apify API
Apify provides web scraping and automation capabilities:
- Extract structured data from cryptocurrency exchange websites
- Monitor competitor pricing and features
- Automate data collection from multiple sources

### CoinGecko API (Optional)
For real-time cryptocurrency price data and market statistics.

**Important**: API keys should never be exposed in client-side code. Create a backend service (Node.js/Express) that makes authenticated requests to these APIs and serves data securely to your frontend.

## Future Enhancements

1. **Real-time Data**: Integrate with CoinGecko or CoinMarketCap APIs for live cryptocurrency prices
2. **News Feed**: Use Firecrawl to scrape and display latest cryptocurrency news
3. **Interactive Charts**: Add cryptocurrency price charts using libraries like Chart.js
4. **User Authentication**: Add login/signup for a full trading platform experience
5. **Backend API**: Create a Node.js/Express server to securely handle API requests

## Security Note

Never commit API keys to version control. The `.env` file is included in `.gitignore` for security.

## License

Apache 2.0 – see [LICENSE](LICENSE) for details.

## Acknowledgements

- Hero image from [Unsplash](https://unsplash.com)
- Cryptocurrency icons and symbols
- Built with simplicity and accessibility in mind
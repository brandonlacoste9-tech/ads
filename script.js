// CryptoHub - Real-time cryptocurrency data
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

  // Fetch real-time data from CoinGecko
  async function fetchCryptoData() {
    try {
      const ids = coins.map(c => c.id).join(',');
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
      );
      
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const data = await response.json();
      updateTicker(data);
      updateCoinCards(data);
    } catch (error) {
      console.error('Error fetching cryptocurrency data:', error);
      // Keep mock data as fallback
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

  // Update the coin cards in the "Popular Cryptocurrencies" section
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

  // Initialize
  fetchCryptoData();
  
  // Refresh data every 60 seconds
  setInterval(fetchCryptoData, 60000);
});
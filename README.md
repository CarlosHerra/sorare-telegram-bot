# Sorare Price Alerts 🚀

A full-stack application to monitor Sorare player card prices and receive instant alerts via Telegram when they drop below your target.

![App Screenshot](file:///c:/Users/cherr/.gemini/antigravity/scratch/sorare-price-alerts/client/public/logo.png) *(Placeholder: Add your own logo/screenshot)*

## ✨ Features

- **Real-time Price Tracking**: Uses Sorare's GraphQL API to fetch the lowest active market listings.
- **Telegram Notifications**: Get notified instantly on your phone when a player's price hits your target.
- **Persistent Storage**: SQLite database to keep your alerts even after server restarts.
- **Unified Interface**: Modern React frontend served directly from a Node.js Express backend.
- **Production-Ready**: Optimized for deployment on platforms like Railway.

## 🛠️ Prerequisites

- **Node.js** (v18 or higher)
- **Sorare API Key**: Obtain one from [Sorare Settings](https://sorare.com/settings/api).
- **Telegram Bot Token**: Create a bot via [@BotFather](https://t.me/botfather).

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd sorare-price-alerts
```

### 2. Install Dependencies
```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### 3. Setup Environment Variables
Create a `.env` file in the `server` directory:
```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
SORARE_API_KEY=your_sorare_api_key
PORT=3001
```

### 4. Run Development Mode
```bash
# In the root directory
npm run dev
```
In development mode:
- **Frontend**: [http://localhost:5173](http://localhost:5173) (Vite dev server)
- **Backend (API)**: [http://localhost:3001](http://localhost:3001)

### 5. Build for Production
```bash
# Build the frontend
npm run build

# Start the combined server
$env:NODE_ENV="production"; npm start
```
In production mode, the backend serves the frontend from the `client/dist` folder. You can access the entire app at [http://localhost:3001](http://localhost:3001) (or your configured `PORT`).

## 📦 Project Structure

```text
├── client/           # React frontend (Vite)
├── server/           # Express backend (Node.js)
│   ├── db.js         # SQLite database management
│   ├── worker.js     # Background price polling service
│   └── services/     # Sorare API & Telegram integration
├── package.json      # Unified scripts for build/start
└── README.md         # You are here!
```

## ☁️ Deployment

This project is optimized for **Railway**:
1. Connect your GitHub repo.
2. Add a **Persistent Volume** mounted at `/app/data`.
3. Set `DATABASE_PATH` to `/app/data/database.sqlite` in your environment variables.
4. Set your `SORARE_API_KEY` and `TELEGRAM_BOT_TOKEN`.
5. **Accessing the App**: Once deployed, Railway will provide a public URL (e.g., `https://your-app.up.railway.app`). Open this URL in any browser to access the dashboard.
6. **Custom Domain**: To use your own domain, go to **Settings > Domains** in Railway, add your domain, and follow the DNS instructions provided (usually involving adding a CNAME record at your registrar).

## 📄 License
MIT

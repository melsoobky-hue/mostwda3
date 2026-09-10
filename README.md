# Mostwda3

Unified dashboard for a mirrors company, aggregating data from 4 e-commerce/marketplace sources with automated syncing, Excel export, analytics, and modern bilingual UI.

## Features

- **Multi-Source Data Sync** — WooCommerce API (Saray Decore, Mostwda3), Playwright scrapers (Chichomz, Raneen)
- **Real-time Dashboard** — KPIs, revenue charts, profit tracking, channel breakdown, auto-refresh
- **Orders Management** — Multi-select, bulk export, persistent filters, column toggle, timeline view
- **Products Management** — Grid/list view, bulk price update, search & filters
- **Customer CRM** — Customer profiles, order history, search
- **Analytics** — 6 chart types, KPIs, governorate breakdown, hourly trends
- **Global Search** — Search across orders, products, customers (Ctrl+K)
- **Dark/Light Themes** — 6 color schemes (Indigo, Teal, Emerald, Rose, Amber, Cyan)
- **Bilingual** — English & Arabic (RTL support)
- **Keyboard Shortcuts** — Navigation, search, help
- **Configurable Auto-Sync** — Adjustable interval (default 60 min)
- **Alerts** — Low stock, loss orders, delayed orders
- **Toast Notifications** — Success, error, warning, info

## Tech Stack

- **Frontend:** React 19, Vite, Recharts, React Router v6, i18next
- **Backend:** Express.js, sql.js, Playwright, node-cron, ExcelJS
- **Database:** SQLite (via sql.js)

## Quick Start

```bash
# Install dependencies
cd server && npm install
cd ../client && npm install

# Build frontend
cd client && npm run build

# Start server
cd server && npm start
```

Server runs on `http://localhost:3001`

## Environment

- Node.js 18+
- Windows (PowerShell)

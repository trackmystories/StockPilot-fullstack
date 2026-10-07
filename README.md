
<img width="220" alt="IMG_5200" src="https://github.com/user-attachments/assets/8fb7e9d3-f608-4fbe-b439-88d522c44916" />
<img width="220" alt="IMG_5199" src="https://github.com/user-attachments/assets/b3499aa7-b3bf-4f07-b9f2-40c0a4ccee21" />
<img width="220" alt="IMG_5198" src="https://github.com/user-attachments/assets/0381df70-fc2c-4d55-91e1-a6dcfed7a066" />
<img width="220" alt="IMG_5194" src="https://github.com/user-attachments/assets/15b06d77-58d6-478a-adc2-2899e4d64988" />
<img width="220" alt="IMG_5113" src="https://github.com/user-attachments/assets/f8f290ef-20d4-42fc-a9af-3d81f0babe1e" />
# StockPilot-fullstack
# StockPilot-fullstack
# StockPilot

StockPilot is a full-stack stock research and investment analysis platform built to turn large amounts of financial data into structured, understandable investment insights.

The platform combines financial statements, market data, analyst estimates, company filings, scoring models, stock screening, smart lists, research reports, watchlists, and portfolio tools across a mobile app, web application, and API.

This repository contains the complete StockPilot platform.

---

## Tech Stack

### Backend

- Node.js
- TypeScript
- NestJS
- Firebase / Firestore
- Firebase Authentication
- REST APIs
- SEC EDGAR
- Financial market data APIs
- Scheduled data pipelines
- Financial scoring and ranking engines

### Web

- Next.js
- React
- TypeScript
- Firebase

### Mobile

- React Native
- Expo
- TypeScript
- Redux Toolkit
- Firebase Authentication

### Architecture

The application separates:

- data providers
- domain calculations
- persistence
- API controllers
- mobile/web presentation
- scheduled intelligence pipelines

The backend performs financial calculations and research processing independently of the frontend applications.

---

# Repository Structure

```text
stock-pilot-tech/
│
├── stockpilot-api/       # NestJS backend
├── stockpilot-mobile/    # React Native / Expo application
├── stock-pilot/          # Next.js web application
├── functions/            # Firebase / cloud functions
└── README.md
```

---

# Getting Started

## Requirements

Install the following before running the project:

- Node.js 20+
- npm
- Git
- Firebase CLI
- Expo CLI / Expo Go for mobile development

Check your versions:

```bash
node --version
npm --version
git --version
```

---

# Running the API

Navigate to the backend:

```bash
cd stockpilot-api
```

Install dependencies:

```bash
npm install
```

Create your local environment file:

```bash
touch .env
```

The API requires configuration for services such as:

```env
PORT=4001

# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Market / financial data provider
MARKET_DATA_API_KEY=

# SEC / research configuration
SEC_USER_AGENT=

# Optional internal API keys
INTERNAL_API_KEY=
```

Do not commit `.env` files or credentials to Git.

Start the API in development mode:

```bash
npm run start:dev
```

The API should then be available at:

```text
http://localhost:4001
```

For example:

```text
http://localhost:4001/api
```

---

## Backend Production Build

Build the NestJS application:

```bash
npm run build
```

Run the production build:

```bash
npm run start:prod
```

---

# Running the Mobile App

Navigate to:

```bash
cd stockpilot-mobile
```

Install dependencies:

```bash
npm install
```

Start Expo:

```bash
npx expo start
```

You can then run StockPilot using:

- iOS Simulator
- Android Emulator
- Expo Go
- development build

To launch directly on iOS:

```bash
npx expo start --ios
```

To launch on Android:

```bash
npx expo start --android
```

---

## Connecting Mobile to the Local API

When running the app on a physical device, `localhost` points to the phone itself rather than your Mac.

Use your computer's local network IP instead.

For example:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.20:4001/api
```

Both devices must be connected to the same network.

For the iOS simulator, you can normally use:

```env
EXPO_PUBLIC_API_URL=http://127.0.0.1:4001/api
```

---

# Running the Web Application

Navigate to:

```bash
cd stock-pilot
```

Install dependencies:

```bash
npm install
```

Create the local environment configuration if required:

```bash
touch .env.local
```

Example:

```env
NEXT_PUBLIC_API_URL=http://localhost:4001/api

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Start the development server:

```bash
npm run dev
```

The application should normally be available at:

```text
http://localhost:3000
```

---

# Running the Full Stack Locally

Open three terminal windows.

### Terminal 1 — API

```bash
cd stockpilot-api
npm install
npm run start:dev
```

API:

```text
http://localhost:4001
```

### Terminal 2 — Web

```bash
cd stock-pilot
npm install
npm run dev
```

Web:

```text
http://localhost:3000
```

### Terminal 3 — Mobile

```bash
cd stockpilot-mobile
npm install
npx expo start
```

---

# Core Backend Capabilities

StockPilot's backend contains the majority of the application's business logic.

It handles:

- company fundamentals
- financial statements
- market data
- historical pricing
- analyst estimates
- SEC filing research
- financial metric normalization
- investment scoring
- risk scoring
- valuation analysis
- momentum analysis
- peer comparisons
- smart-list generation
- stock filtering
- news
- watchlists
- notifications
- research reports
- scheduled intelligence pipelines

---

# Financial Scoring Engine

StockPilot does not simply expose raw API data.

The backend transforms financial data into structured scoring models including areas such as:

- valuation
- growth
- quality
- financial strength
- risk
- momentum
- earnings
- analyst estimate revisions
- cash flow
- profitability

Scores use eligibility rules, evidence requirements and data-coverage checks so incomplete companies are not treated as equivalent to companies with strong underlying financial coverage.

Calculated results can then be persisted to Firestore and consumed efficiently by the mobile and web applications.

This architecture avoids performing expensive financial calculations every time a user opens a screen.

---

# Smart Lists

The scoring engine powers automatically generated investment lists such as:

- Undervalued
- High Growth
- High Quality
- Financially Strong
- Low Risk
- Strong Momentum
- Earnings Improving
- Estimates Rising
- Cash Flow Leaders
- High ROIC
- Profitable Growers
- Cheap vs Peers
- Deep Value
- Growth at Fair Price
- Quality at Discount
- Strong Balance Sheets
- Margin Leaders
- Earnings Winners
- Sector Leaders

These lists are generated from normalized financial metrics rather than manually curated stock symbols.

---

# SEC Research Pipeline

StockPilot contains a large-scale SEC research pipeline capable of processing company filings including:

- 10-K
- 10-Q
- 8-K
- 20-F
- 40-F
- 6-K

The research system is designed to:

- retrieve filings
- extract structured information
- reuse cached data
- resume interrupted processing
- skip unchanged companies
- generate application-ready research
- store prepared results for frontend consumption

This allows company research to be generated across thousands of securities rather than only on demand for individual stocks.

---

# Firestore

Firestore is used as the application-facing persistence layer for pre-computed data.

Instead of recalculating large financial models for every request, StockPilot can calculate data in backend pipelines and persist prepared results such as:

```text
symbol
companyName
score
rank
coverage
riskScore
riskLevel
volatilityScore
price
change
changePercentage
```

The mobile and web clients can then retrieve lightweight application-ready documents.

---

# Authentication

StockPilot uses Firebase Authentication.

Authenticated requests from the frontend include the Firebase authentication token when accessing protected API routes.

Never store authentication credentials or Firebase private keys inside frontend code.

---

# Environment Files

Environment files are intentionally excluded from Git.

Typical files include:

```text
stockpilot-api/.env
stockpilot-mobile/.env
stock-pilot/.env.local
```

Never commit:

```text
.env
.env.local
service-account.json
Firebase private keys
API keys
access tokens
```

---

# Useful Commands

## API

```bash
cd stockpilot-api

npm install
npm run start:dev
npm run build
npm run start:prod
npm test
```

## Web

```bash
cd stock-pilot

npm install
npm run dev
npm run build
npm start
```

## Mobile

```bash
cd stockpilot-mobile

npm install
npx expo start
npx expo start --ios
npx expo start --android
```

---

# Development

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/stockpilottect.git
```

Enter the project:

```bash
cd stockpilottect
```

Install each application's dependencies:

```bash
cd stockpilot-api && npm install
cd ../stock-pilot && npm install
cd ../stockpilot-mobile && npm install
```

Then configure the required environment variables before starting each application.

---

# Project Goals

StockPilot was built around several engineering goals:

- keep complex financial logic on the backend
- make calculations reproducible and testable
- process thousands of securities efficiently
- avoid unnecessary third-party API requests
- separate raw provider data from application-ready data
- support multiple market-data providers
- expose consistent APIs to mobile and web clients
- allow long-running research pipelines to resume safely
- keep the frontend fast by pre-computing expensive analytics

---

# Disclaimer

StockPilot is a research and analytics platform.

Information produced by the application is intended for informational and research purposes only and should not be considered financial or investment advice.

---

## Author

**Ali Shirazee**

Full-Stack Software Engineer

Built across backend, web and mobile with TypeScript, NestJS, Next.js, React Native, Firebase and financial-data processing pipelines.

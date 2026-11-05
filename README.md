<div align="center">

# 🗺️ EcoLens: Shadow Economy Map
### *See the Economy That No One Measures*

[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)]()
[![Program](https://img.shields.io/badge/INSA-Summer%20Camp%202026-blue)]()
[![Submission Deadline](https://img.shields.io/badge/Deadline-Nov%206%2C%202026--09%3A00%20AM-red)]()
[![License](https://img.shields.io/badge/License-MIT-green)]()

An AI-powered geospatial platform detecting emerging economic activity across Ethiopia using free, publicly available satellite and mobility-derived data — surfacing physical growth signals months before they appear in official government statistics.

---

[🌐 Live Frontend Demo](https://ecolens.vercel.app) • [⚙️ Production Backend API](https://ecolens-5z94.onrender.com) • [🎥 5-Minute Video Presentation](#-video-presentation)

</div>

---

## 📌 Submission Summary & Verification Checklist

| Requirement | Details & Links |
| :--- | :--- |
| **1. GitHub Repositories** | • **Frontend Repo:** [github.com/live-economy-map/frontend](https://github.com/live-economy-map/frontend)<br>• **Backend Repo:** [github.com/live-economy-map/backend](https://github.com/live-economy-map/backend) |
| **2. Video Presentation** | [🎥 Watch 5-Minute Video Presentation (Voice-Over Demo)](https://youtu.be/your-demo-video-link-here) *(Insert your YouTube / Loom / Google Drive link)* |
| **3. Project Information** | Real-time economic activity detection using 4 fused satellite & mobility sources (VIIRS, GHSL, RWI, GDELT) with Groq LLM natural language search, ground-truth case studies, watchlists, Chapa payments, and a public developer API. |
| **4. Team Information** | 6 Team Members (Full Names & CTC IDs documented below). |

---

## 👥 Project Team

| # | Full Name | CTC ID | Role / Responsibility |
|---|---|---|---|
| 1 | **Adonay Chilotu** | `CTC-1611-26` | Project Lead & Full-Stack Architecture |
| 2 | **Abrham Teramed** | `CTC-3158-26` | Backend API & Geospatial Pipeline Lead |
| 3 | **Amira Niguse** | `CTC-2988-26` | Frontend UI/UX & Interactive Map Lead |
| 4 | **Aneni Kidanu** | `CTC-1451-26` | Data Ingestion, Satellite Modeling & Validation |
| 5 | **Abenezer Getamesay** | `CTC-2279-26` | AI Search, LLM Integration & Database Engineering |
| 6 | **Anteneh Wondwosen** | `CTC-286-26` | QA, Security, Testing & Cloud Deployment |

---

## 🎥 Video Presentation

> [!IMPORTANT]
> **5-Minute Video Demo with Voice-Over:**  
> 🔗 **[Click Here to Watch the Video Presentation](https://youtu.be/your-demo-video-link-here)**  
> *(Alternative Backup Link: [drive.google.com/your-backup-link](https://drive.google.com/your-backup-link))*

### 5-Minute Presentation Outline & Voice-Over Guide
1. **0:00 - 1:00 | The Problem:** The critical lag of official economic statistics in Ethiopia (census, business registries) vs. physical growth happening in real time in peripheral and urbanizing zones.
2. **1:00 - 2:00 | The Geospatial Map & 4-Signal Fusion:** Exploring the interactive Leaflet grid (`0.01°` resolution) across Addis Ababa, switching layers (VIIRS Night Lights, GHSL Built-Up Area, Meta RWI, GDELT News), and using the time-slider.
3. **2:00 - 2:45 | AI-Powered Search & Cell Inspection:** Asking the map natural-language questions (*"Show fast growing commercial hubs around Bole and Lebu"*) and inspecting a cell for AI-generated summaries and trend graphs.
4. **2:45 - 3:45 | Independently Validated Case Studies:** Proving our detection against confirmed ground truth with evidence tiers (Official, Market Reports, Infrastructure, Local News) and before/after satellite imagery.
5. **3:45 - 4:30 | User Platform, Watchlists & Custom Reports:** User registration, saving areas, setting threshold alert rules, and submitting custom report requests.
6. **4:30 - 5:00 | Monetization, Developer API & Scalability:** Chapa payment gateway integration, API key generation (`ak_live_...`), and the automated admin data pipeline.

---

## 📖 Overview & Purpose

**Ethiopia's real economic activity is happening faster than official statistics can track it.**

Formal economic indicators — business registrations, tax records, and census data — take months or years to publish and rarely capture peri-urban expansion or informal enterprise clusters. Meanwhile, physical evidence of growth is visible from space right now:
- **Night-time radiance spikes** as generators and electrical lines turn on.
- **Surface changes and roof construction** appear in satellite imagery.
- **Population and settlement densities** surge before municipal registries record them.

**EcoLens (Shadow Economy Map)** fuses 4 high-frequency satellite and public datasets into a single, calibrated **Composite Growth Score (0–100)** mapped across regular spatial grid cells (`~1.1 km²`), pairing geospatial intelligence with an LLM copilot so anyone can understand what is driving growth.

---

## 💡 How It Works: The 4-Signal Fusion Engine

We detect physical and economic reality; we do not guess:

```
┌────────────────────────────────────────────────────────┐
│               4 PUBLIC DATA SIGNALS                    │
├──────────────────────────┬─────────────────────────────┤
│ 🛰️ VIIRS Night-Time Light │ Activity intensity & power  │
│ 🏗️ GHSL Built-Up Change  │ Physical construction surge │
│ 💰 Meta RWI Index        │ Relative wealth baseline    │
│ 📰 GDELT News Signals    │ Ground-truth news validation│
└─────────────┬────────────┴──────────────┬──────────────┘
              │                           │
              ▼                           ▼
    ┌───────────────────┐       ┌───────────────────┐
    │ Spatial Grid Pull │       │ Normalization &   │
    │ (0.01° Cells)     │       │ Dynamic Weights   │
    └─────────┬─────────┘       └─────────┬─────────┘
              │                           │
              └─────────────┬─────────────┘
                            ▼
          ┌───────────────────────────────────┐
          │  Composite Growth Score (0 - 100) │
          └─────────────────┬─────────────────┘
                            ▼
          ┌───────────────────────────────────┐
          │     Groq LLM Intelligence         │
          │  • Plain-Language AI Summaries    │
          │  • Natural-Language Map Query     │
          └───────────────────────────────────┘
```

---

## ✨ Key Features Implemented

### 1. 🗺️ Interactive Geospatial Growth Map
- **High-Density Spatial Grid:** 0.01° grid cells spanning Addis Ababa and emerging economic corridors.
- **Choropleth Growth Heatmap:** Dynamic color gradients visualizing rapid growth, moderate expansion, or stable areas.
- **Multimodal Layer Toggling:** Toggle between VIIRS (Night Lights), GHSL (Built-up Area), Meta RWI (Wealth Proxy), and GDELT events.
- **Historical Time Slider:** Scrub backward and forward in time to watch corridors expand month-over-month.

### 2. 🤖 AI Natural Language Copilot & Cell Summaries
- **Natural Language Search:** Type queries like *"Find booming manufacturing corridors near Lemi"* and let the AI parser filter cells and highlight zones.
- **Click-to-Inspect Drawer:** Clicking any cell opens a full breakdown displaying signal contributors, historical trend charts (Recharts), and an automated plain-language AI explanation.

### 3. 📑 Independently Validated Case Studies
- Proves the methodology against independently confirmed real-world growth corridors.
- Multi-tier evidence verification: **Official**, **Market Report**, **Infrastructure**, and **Local News**.
- Displays the precise timeline: **Score Rise Date** vs. **Confirmed Date**, showing how many months earlier satellite signals caught the growth.
- Interactive before/after satellite imagery sliders.

### 4. 🔔 User Identity, Saved Areas & Watchlists
- Full JWT authentication (Register, Login, Email Verification, Password Reset).
- **Saved Areas:** Bookmark priority grid cells.
- **Automated Watchlists:** Configure growth score thresholds (e.g., *Alert me when growth score rises above 75*) with instant notifications.

### 5. 📝 Custom Report Request Portal
- Submit specific geographic coordinates or bounding boxes for bespoke deep-dive analysis.
- Complete lifecycle tracking: `SUBMITTED` &rarr; `IN_REVIEW` &rarr; `IN_PROGRESS` &rarr; `DELIVERED`.

### 6. 💳 Commercialization & Chapa Payments
- Native integration with **Chapa Payment Gateway** for Ethiopian Birr (ETB), cards, and Telebirr.
- Tiered subscription plans (Free, Pro, Enterprise) with backend entitlement guards.

### 7. 🔌 Developer API Platform
- Self-service API key provisioning (`ak_live_...`).
- REST endpoints (`/api/v1/cells`, `/api/v1/scores`, `/api/v1/history`) with rate-limiting, usage analytics, and documentation.

### 8. 🛡️ Admin Operations Center
- Pipeline execution monitor: trigger automated data pulls, inspect run health, and tune signal weightings.
- Case study authoring and curation suite.
- Demand metrics and custom report request review workflow.

---

## 🛠️ Complete Technology Stack

```
                          ECOSYSTEM ARCHITECTURE
┌────────────────────────────────────────────────────────────────────────┐
│ FRONTEND (React 19 + TypeScript + Vite + Tailwind CSS v4)              │
│ • Map: React-Leaflet & Leaflet Core                                    │
│ • State: TanStack Query v5 + Zustand                                   │
│ • Visualization: Recharts                                              │
│ • Components: Radix UI Primitives + Lucide Icons                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / REST (Axios Interceptors)
┌───────────────────────────────────▼────────────────────────────────────┐
│ BACKEND (Node.js + Express 5 + TypeScript + Prisma 7)                  │
│ • Routing & Architecture: Clean Controller-Service-Repository Pattern  │
│ • Validation: Zod Strict Schemas                                       │
│ • Security: Helmet, CORS Dynamic Origin Reflection, Bcrypt, Rate-Limit │
│ • AI Engine: Groq LLM API                                              │
│ • Payment Gateway: Chapa API Integration                               │
│ • Logging: Pino Structured JSON Logger                                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Prisma PostgreSQL 18 Driver Adapter
┌───────────────────────────────────▼────────────────────────────────────┐
│ DATABASE & INFRASTRUCTURE                                              │
│ • Database: PostgreSQL 18 (UUIDs, JSONB, Spatial Grid Indexes)         │
│ • Frontend Deployment: Vercel (Edge CDN)                               │
│ • Backend Deployment: Render (Oregon Web Service)                      │
│ • Tests: Vitest (61 backend test suites, 18 frontend test suites)     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started & Local Development

### Prerequisites
- **Node.js** >= 20.0.0
- **PostgreSQL** 18
- **npm** >= 10.0.0

---

### 1. Backend Setup

```bash
# 1. Clone repository
git clone https://github.com/live-economy-map/backend.git
cd backend

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
```

Ensure `.env` contains:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/test_db"
JWT_SECRET="dev_jwt_secret_change_in_production"
JWT_EXPIRES_IN="7d"
CLIENT_URL="http://localhost:5173"
LLM_API_KEY="your_groq_api_key_here"
GROQ_KEY="your_groq_api_key_here"
ADMIN_SEED_EMAIL="admin@example.com"
ADMIN_SEED_PASSWORD="dev_placeholder_password_123"
```

```bash
# 4. Generate Prisma Client and apply migrations
npx prisma generate
npx prisma migrate dev

# 5. Seed initial data (Admin, Grid cells, and Case studies)
npm run prisma:seed
npm run prisma:seed:grid
npm run prisma:seed:casestudies

# 6. Start development server
npm run dev
# Server running at http://localhost:3000
```

---

### 2. Frontend Setup

```bash
# 1. In a separate terminal, navigate to frontend
cd ../frontend

# 2. Install dependencies
npm install

# 3. Create .env file
echo "VITE_API_URL=/api/v1" > .env

# 4. Start Vite development server
npm run dev
# App running at http://localhost:5173
```

---

## 🧪 Testing & Quality Assurance

Both frontend and backend include automated test suites:

```bash
# Run backend tests (61 suites, 498 tests)
cd backend
npm test

# Run frontend tests (18 suites, 44 tests)
cd frontend
npm test

# Production build verification
npm run build
```

---

## 🌐 Production Deployments

- **Frontend (Vercel):** [https://ecolens.vercel.app](https://ecolens.vercel.app)
- **Backend API (Render):** [https://ecolens-5z94.onrender.com](https://ecolens-5z94.onrender.com)
- **API Health Check:** [https://ecolens-5z94.onrender.com/health](https://ecolens-5z94.onrender.com/health)

---

## 🔮 Future Roadmap

- [x] **Phase 1: Detection Core (Current):** Public interactive map for Addis Ababa, 4-source fusion, AI search, and validated case studies.
- [x] **Phase 2: Identity & Requests (Current):** User accounts, saved areas, watchlists, threshold alerts, and custom analysis requests.
- [x] **Phase 3: Monetization & API (Current):** Chapa ETB billing integration and developer API key access.
- [ ] **Phase 4: Second City Expansion:** Expanding spatial ingestion to Dire Dawa, Hawassa, and Adama.
- [ ] **Phase 5: National Coverage & Predictive Forecasting:** Machine learning models projecting 6-month growth probability corridors across Ethiopia.

---

## 📜 License

This project is licensed under the **MIT License** — feel free to use, modify, and distribute with attribution.

<div align="center">

**INSA Summer Camp 2026 Submission**  
*EcoLens — Mapping Growth Before the Statistics Catch Up.*

</div>

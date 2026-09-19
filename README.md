# 🌿 EcoCart — AI-Powered Sustainable E-Commerce Platform

> **Conscious Commerce Driven by Intelligent AI Eco-Grading & Community Buying**

EcoCart is a full-stack sustainable commerce platform that empowers consumers to make informed, lower-carbon choices. Every product receives an explainable **A–F Eco-Grade** across 5 dimensions using **Gemini AI**, tracks real-world CO₂ savings in a personal living impact dashboard, surfaces greener swaps, and unlocks collective discounts through community group buying.

---

## 🏗 Project Architecture

```
EcoCart/
├── frontend/                 # Client Web Application
│   ├── index.html            # Marketplace UI, Impact Dashboard, Group Buys & AI EcoAdvisor
│   ├── styles.css            # Responsive design system & animations
│   └── app.js                # Supabase Auth/DB Client + FastAPI AI Client
├── backend/                  # Python FastAPI Intelligence Backend
│   ├── app/
│   │   ├── main.py           # REST API routes & CORS middleware
│   │   ├── config.py         # Environment configuration
│   │   └── services/
│   │       └── gemini_service.py # Gemini AI grading, RAG advisor & fallback engine
│   ├── requirements.txt      # Backend Python dependencies
│   └── .env.example          # Environment variables template
├── supabase/                 # Database Schema & Migrations
│   ├── schema.sql            # Core tables & Row Level Security (RLS) policies
│   ├── impact_upgrade.sql    # Product metadata & explainable grading fields
│   ├── seed_group_buys.sql   # Initial collective buying circles
│   └── backfill_profiles.sql # Profile trigger sync script
└── README.md
```

---

## ⚡ Tech Stack (100% Free Tier)

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JS | High-performance, lightweight UI |
| **Backend** | Python, FastAPI, Uvicorn | Async REST API & AI microservice |
| **AI / GenAI** | Google Gemini Flash-Lite, with optional Groq (Llama 3.3) failover | 5-dimension product eco-scoring & EcoAdvisor |
| **Embeddings** | Gemini `gemini-embedding-001` (768-d, computed once per product) | Semantic product vectors stored in `pgvector` |
| **Hosting** | Vercel (frontend) + Render (backend) | Free tiers, no credit card |
| **Keep-alive** | GitHub Actions cron | Stops Render sleeping and Supabase pausing |
| **Database & Auth** | Supabase (PostgreSQL + RLS) | User authentication, carbon logs, catalog |
| **Vector Search** | Supabase `pgvector` | Semantic similarity & greener product swaps |
| **Real-time** | Supabase Realtime | Live group-buy membership updates |

---

## 🚀 How to Run Locally

### Prerequisites
- **Python 3.10+**
- A modern web browser
- *(Optional)* Free Gemini API key from [Google AI Studio](https://aistudio.google.com)

---

### Step 1: Start the Backend (FastAPI)

Open a terminal in the `backend/` folder:

```powershell
cd backend

# Create & activate virtual environment (Windows)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# (Optional) Set your Gemini API key in .env
# Copy .env.example to .env and add GEMINI_API_KEY=AIzaSy...

# Start the server
uvicorn app.main:app --reload --port 8000
```

The backend is now live at:
- **API URL:** `http://localhost:8000`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`
- **Health Check:** `http://localhost:8000/health`

---

### Step 2: Start the Frontend

Open a second terminal in the `frontend/` folder:

```powershell
cd frontend

# Run a lightweight local HTTP server with Python
python -m http.server 5500
```

Now open your browser and go to:
👉 **`http://localhost:5500`**

*(Or right-click `frontend/index.html` in VS Code and choose **"Open with Live Server"**)*

---

## ☁️ Deployment (100% free tier)

**Backend → Render**
1. Push this repo to GitHub.
2. On [render.com](https://render.com) → **New +** → **Blueprint** → connect the repo. Render reads `render.yaml` at the repo root and pre-fills a free web service rooted at `backend/`.
3. When prompted, fill in the env vars: `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. `ALLOWED_ORIGINS` is already set in `render.yaml`. Optionally add `GROQ_API_KEY` (free, no card, [console.groq.com](https://console.groq.com)) in the Render dashboard so chat keeps working after Gemini's daily free quota runs out.
4. Deploy. Note the resulting URL, e.g. `https://ecocart-backend.onrender.com`.
   - Free plan spins down after 15 minutes of inactivity — the first request after idle takes 30–60s to wake up.

**Frontend → Vercel**
1. On [vercel.com](https://vercel.com) → **Add New Project** → import the same repo.
2. Set **Root Directory** to `frontend`. Framework preset: **Other** (static site — no build step needed).
3. Deploy. Note the resulting URL, e.g. `https://ecocart.vercel.app`.
4. `frontend/app.js` auto-detects `localhost` vs. production and points at the Render backend URL hardcoded near the top of the file — update that URL if your Render service name differs from `ecocart-backend`.
5. If your Vercel URL differs from the one in `render.yaml`, update `ALLOWED_ORIGINS` there (or in Render → **Environment**) so CORS allows it.

**Staying free forever**
- `.github/workflows/keep-alive.yml` pings the backend and `/health/db` every 10 minutes: Render never sleeps and Supabase never pauses. GitHub disables scheduled workflows after 60 days without repo activity — re-enable them in the Actions tab if that happens.
- Recommendations read the embedding already stored in Postgres, so they use no LLM quota. Chat answers are cached for an hour and limited to 20 questions per IP per 10 minutes to protect the free quota.
- One Render free service running 24/7 uses ~744 of the 750 free monthly instance hours; don't run a second always-on free service in the same workspace.

---

## 🌟 Key Features

1. **AI Eco-Grading Engine**:
   - Scores materials, packaging recyclability, lifecycle emissions, ethical labor, and product durability.
   - Outputs composite letter grades (A–F) and score out of 100 with clear explainability.

2. **Interactive AI EcoAdvisor Widget**:
   - Floating chat assistant providing instant guidance on material sustainability, recycling codes (e.g. PAP 22, HDPE 2), and carbon-saving swaps.

3. **Personal Impact Dashboard & Gamification**:
   - Computes personal **EcoScore** based on purchase history.
   - Calculates real-world equivalents (e.g., *“Equivalent to charging 145 smartphones”*).
   - Unlocks impact badges (*Carbon Champion*, *Plastic-Free Pick*, *First Purchase*).

4. **Collective Group Buying (Buying Circles)**:
   - Community-driven group purchases with live progress bars and discount thresholds.

5. **Packaging Choice Selector**:
   - Dynamic checkout packaging options with per-choice CO₂ calculation saved directly to the user's `carbon_log`.

---

## 🔒 Security & Best Practices
- **Row Level Security (RLS)**: Enforced in PostgreSQL via Supabase policies ensuring users can only read and write their own data.
- **Graceful Fallbacks**: Intelligent heuristic rules allow the app to function even during offline network conditions or before API key setup.


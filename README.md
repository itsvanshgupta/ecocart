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
| **AI / GenAI** | Google Gemini 1.5 Flash | 5-dimension product eco-scoring & EcoAdvisor |
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


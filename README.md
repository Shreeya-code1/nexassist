<div align="center">

# 🛸 NexAssist

### AI-Powered Product Diagnostic Platform

*The information already exists. The problem is access.*

![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Groq](https://img.shields.io/badge/Groq_AI-F55036?style=for-the-badge&logo=groq&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

**[Live Demo](#) · [Report Bug](#)**

</div>

---

## 👥 Team

**Team Name:** Brocaffiene ☕

| Name | Role |
|------|------|
| **Shreeya Bhardwaj** | AI Agent + Backend |
| **Divyesh Mangla** | Backend + Infrastructure |
| **Pratham Jindal** | Frontend + UI/UX |
| **Kanishka Sharma** | Full Stack + Integration |

**Hackathon:** Assistant for Your Products — 24-Hour Build  
**Institution:** Thapar Institute of Engineering and Technology

---

## 📌 Table of Contents

- [Overview](#-overview)
- [The Problem](#-the-problem)
- [Our Solution](#-our-solution)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Setup and Installation](#-setup-and-installation)
- [Usage Guide](#-usage-guide)

---

## 🔭 Overview

NexAssist is a product support platform where companies upload their manuals and users get AI-powered diagnostic help — not from a chatbot that returns search results, but from an **intelligent agent that investigates like a trained technician**.

When a user reports a problem, NexAssist asks one targeted question at a time, eliminates unlikely causes, and narrows down to the exact fix — citing the precise page and section from the official manual as evidence.

---

## 🚩 The Problem

Every day, people deal with broken scooters, malfunctioning ACs, washing machines that won't spin, and water purifiers that stop working. The fix is almost always documented — buried somewhere in a 200-page PDF manual.

- Manuals are long and hard to navigate
- Support information is scattered across PDFs, videos, and websites
- Most users give up and call a technician for issues they could fix themselves
- Companies lose trust and incur unnecessary support costs

> *The information already exists. The problem is access.*

---

## 💡 Our Solution

NexAssist turns any product manual into an **expert diagnostic engineer** available 24/7.

**For Companies:** Upload PDF manuals, manage products, and get a Product Health Score showing what your users struggle with most.

**For Users:** Describe your issue in plain language. The AI investigates it the way a real technician would — not by dumping a list of possible causes, but by systematically narrowing down to the exact root cause.

---

## ✨ Features

### Core Features

**🔍 Intelligent Diagnostic Agent**
- Stateful multi-turn investigation — not a one-shot search
- Asks exactly one targeted question per turn
- Eliminates hypotheses based on user responses
- Delivers a diagnosis only when confidence exceeds 80%
- Every claim cites the exact page and section from the official manual

**📄 Smart Manual Ingestion**
- Upload PDF manuals via drag-and-drop
- Extracts text, diagrams, tables, error codes, and warnings page by page
- Auto-detects section types: Troubleshooting, Maintenance, Warning, Procedure, Specification
- Chunks and embeds content locally — no external embedding API needed
- Real-time ingestion progress: Parse → Chunk → Embed → Index

**🏢 Company Portal**
- Register company and manage team members with role-based access
- Add products with categories, descriptions, and model variants
- View all uploaded manuals with status and chunk count
- Re-index or archive manuals anytime

**📊 Product Health Score Dashboard**
- See top failure modes reported by users
- Track average turns to resolve an issue
- Monitor unresolved session rates
- Identify which product components users struggle with most

### Bonus Features

**🖼️ Image-Based Troubleshooting**
Upload a photo of the broken component, error screen, or warning indicator. The AI uses Groq Vision to identify the issue and incorporate it into the diagnosis.

**🎙️ Voice Input**
Hold-to-speak hands-free mode powered by Groq Whisper. Useful when your hands are occupied during repair.

**⚡ Real-Time Hypothesis Visualization**
A live panel shows the AI's diagnostic thinking — which causes are being considered, their likelihood, which have been eliminated and why, and current confidence level.

**🔺 Human Escalation**
When a problem is unsafe, blocked, or requires authorized service, the AI escalates to a human support agent with a full diagnostic summary.

---

## 🛠 Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **FastAPI** (Python 3.11) | REST API + SSE streaming |
| **Groq API** — `llama-3.3-70b-versatile` | Diagnostic reasoning + tool calling |
| **Groq API** — `llama-3.2-11b-vision-preview` | Image analysis |
| **Groq API** — `whisper-large-v3` | Voice transcription |
| **sentence-transformers** `all-MiniLM-L6-v2` | Local embeddings (free, no API) |
| **ChromaDB** | Local persistent vector store |
| **PyMuPDF** | PDF text + image extraction |
| **Supabase** | PostgreSQL database + Auth + File Storage |

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 14** (App Router) | React framework |
| **TypeScript** | Type safety throughout |
| **Tailwind CSS** + shadcn/ui | UI components |
| **Framer Motion** | Animations |
| **SWR** | Data fetching + polling |
| **Recharts** | Analytics dashboard charts |

### Infrastructure
| Service | Purpose |
|---------|---------|
| **Supabase** | Database, Auth, Storage (free tier) |
| **Groq Cloud** | LLM inference (6000 req/day free) |
| **ChromaDB** | Self-hosted vector DB (local) |

> **Cost: $0** — The entire LLM + embedding + storage stack runs on free tiers.

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Next.js Frontend                    │
│   Company Portal │ Product Marketplace │ Chat UI     │
└────────────────────────┬────────────────────────────┘
                         │ REST + SSE
┌────────────────────────▼────────────────────────────┐
│                   FastAPI Backend                    │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  Ingestion  │  │  Diagnostic  │  │    Auth    │  │
│  │  Pipeline   │  │    Agent     │  │  & Repos   │  │
│  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘  │
│         │                │                │          │
│  ┌──────▼──────┐  ┌──────▼───────┐  ┌────▼───────┐  │
│  │  ChromaDB   │  │  Groq API    │  │  Supabase  │  │
│  │ (local vec) │  │ (LLM+Vision  │  │  (DB+Auth  │  │
│  │             │  │  +Whisper)   │  │  +Storage) │  │
│  └─────────────┘  └──────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Diagnostic Agent Loop

```
User: "My washing machine drum isn't spinning"
         │
         ▼
  [Search Manual]  ←── Tool call: search_manual_evidence
         │
         ▼
  "Does it hum but not spin, or is it completely silent?"
         │
  User: "It hums"
         │
         ▼
  [Eliminate: Motor fault, Control board]
  [Hypothesis: Drive belt — 89% confidence]
         │
         ▼
  [Update Diagnostic State]  ←── Tool call: update_diagnostic_state
         │
         ▼
  "Check the drive belt — Section 3.2, Page 34 of Service Manual"
  [Show extracted diagram from manual]
```

---

## ⚙️ Setup and Installation

### Prerequisites
- Python 3.11+
- Node.js 18+
- A [Supabase](https://supabase.com) account (free)
- A [Groq](https://console.groq.com) API key (free)

### 1. Clone the repository

```bash
git clone https://github.com/your-repo/nexassist.git
cd nexassist
```

### 2. Supabase setup

- Create a new project at [supabase.com](https://supabase.com)
- Go to **SQL Editor** and run the migration file:

```bash
# Copy contents of backend/schema.sql and paste into Supabase SQL Editor
```

- Go to **Storage** and create three public buckets: `manuals`, `session-media`, `company-assets`
- Go to **Authentication → Providers → Email** and disable "Confirm email" for development
- Grab your keys from **Settings → API**

### 3. Backend setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Fill in .env with your Supabase and Groq keys
```

**.env**
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
GROQ_API_KEY=gsk_...
CHROMA_PERSIST_DIR=./chroma
EMBEDDING_MODEL_NAME=all-MiniLM-L6-v2
APP_ENV=development
APP_VERSION=1.0.0
CORS_ORIGINS=["http://localhost:3000"]
```

```bash
# Start the backend
uvicorn app.main:app --reload --port 8000
```

> **Note:** First run downloads the sentence-transformers model (~90MB). This is a one-time download.

Verify at: `http://localhost:8000/api/v1/health` → `{"status": "ok"}`

### 4. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Fill in Supabase keys and API URL
```

**.env.local**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_DEMO_COMPANY_ID=        # fill after creating your first company
```

```bash
npm run dev
```

Frontend runs at: `http://localhost:3000`

### 5. First-time data setup

- Sign up at `http://localhost:3000/auth/signup`
- Create a company via `http://localhost:8000/docs` → `POST /api/v1/companies`
- Copy the returned `id` into `NEXT_PUBLIC_DEMO_COMPANY_ID` in `.env.local`
- Restart the frontend

---

## 📖 Usage Guide

### As a Company

1. **Sign up** and create your company account
2. **Add a product** — name, category, description
3. **Upload a manual** — drag and drop any PDF (service manual, user guide, datasheet)
4. Watch the ingestion pipeline run: Parse → Chunk → Embed → Index
5. View your **Product Health Score** as users start sessions

### As a User

1. Go to the **Support** page
2. Select the product you need help with
3. Describe your issue in plain language — "my horn isn't working", "machine won't drain"
4. Answer the AI's follow-up questions (it asks one at a time)
5. Receive a precise diagnosis with the **exact page reference** from the manual
6. Optionally upload a **photo** of the issue or use **voice input**

---


## 📝 Additional Notes

### What makes NexAssist different

Most teams at this hackathon will build a RAG chatbot — upload a PDF, ask a question, get an answer. NexAssist is architecturally different:

| Typical RAG Chatbot | NexAssist Diagnostic Agent |
|---------------------|---------------------------|
| One-shot answer | Multi-turn investigation |
| Returns search results | Eliminates hypotheses |
| No state between messages | Full session state machine |
| Answers everything immediately | Waits for 80% confidence |
| No reasoning shown | Live hypothesis visualization |

### Why Groq

Groq's inference speed makes the multi-turn agentic loop feel instantaneous. A typical diagnostic session involves 3–6 LLM calls (including tool calls). On Groq, this completes in under 3 seconds total — on OpenAI GPT-4o it would take 15–20 seconds.

### Completely free to run

| Component | Service | Cost |
|-----------|---------|------|
| LLM (chat + vision + voice) | Groq free tier | $0 |
| Embeddings | Local sentence-transformers | $0 |
| Vector DB | ChromaDB local | $0 |
| Database + Auth | Supabase free tier | $0 |
| File Storage | Supabase free tier | $0 |
| **Total** | | **$0** |

---

<div align="center">

Built in 24 hours by **Brocaffiene** ☕ · Powered by Groq · Zero API cost

*Thapar Institute of Engineering and Technology*

</div>

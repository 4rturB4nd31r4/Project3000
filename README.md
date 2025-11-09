# Project3000

# 🧠 Zero-Click CRM – Voice-to-Structured CRM (Hack IA MIT)

## 🚀 Overview
**Zero-Click CRM** eliminates manual data entry in platforms like HubSpot.  
Our prototype uses **Google Cloud Speech-to-Text** and **Gemini (Vertex AI)** to **turn voice notes and recorded calls into structured CRM entries** — automatically creating contacts, notes, deals, and tasks.

## ⚙️ Architecture

### Input → Processing → Output

| Stage | Description | Technology |
|--------|--------------|-------------|
| 🎙️ **Input** | User provides an audio file (voice note, call, memo) | — |
| 🧩 **Speech Recognition** | Audio is transcribed into text | Google Cloud **Speech-to-Text V2** |
| 🧠 **Understanding & Automation** | Text is semantically parsed to detect intent (create contact, note, deal, etc.) | **Gemini 2.5 Flash (Vertex AI)** |
| 🔗 **CRM Integration** | Relevant HubSpot API endpoints are called automatically | **HubSpot CRM API** |
| ✅ **Output** | Contact / Note / Deal / Task created automatically | — |


---

## 🧩 Project Structure

| File | Description |
|------|--------------|
| `app.py` | Flask API exposing `/audio_to_transcript`, `/synthesis`, and `/hubspot_commands` endpoints |
| `audio_to_transcript.py` | Converts remote audio (GCS URI) into text via Google Speech-to-Text V2 |
| `stt_local.py` | Transcribes local audio files |
| `agent.py` | Core automation logic — uses **Gemini 2.5 Flash** to interpret transcripts and trigger HubSpot actions |
| `helpers.py` | CRUD utilities for HubSpot contacts, notes, deals, and tasks |
| `env/vars.py` | Environment variables and prompt definitions (not included in the public repo) |

---

## 🧠 Main Workflow (Voice → CRM)

1. User uploads an **audio file (.wav or .mp3)**  
2. `audio_to_transcript` sends it to **Google Cloud Speech-to-Text** for transcription  
3. The transcript is processed by **Gemini**, which determines the CRM intent and calls HubSpot APIs to:  
   - Create or update a contact  
   - Add a note  
   - Create a deal  
   - Create a task  
4. The system returns a concise confirmation message.

---

## 🧰 Tech Stack

| Category | Tool |
|-----------|------|
| AI / NLP | **Google Gemini 2.5 Flash (Vertex AI)** |
| Speech Recognition | **Google Cloud Speech-to-Text V2** |
| Backend | **Flask (Python)** |
| CRM | **HubSpot API v3 / v4** |
| Cloud | **Google Cloud Run / Functions (recommended)** |

---

## 🔑 Environment Variables

| Variable | Description |
|-----------|-------------|
| `GEMINI_API_KEY` | Gemini model API key |
| `HUBSPOT_TOKEN` | HubSpot private access token |
| `GOOGLE_CLOUD_PROJECT` | Google Cloud project ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to your GCP service account JSON file |

---

## 🔍 API Endpoints

| Endpoint | Method | Description |
|-----------|---------|-------------|
| `/` | GET | Health check |
| `/audio_to_transcript` | POST | Receives `{ "audio_url": "<gs://...>" }` → returns transcript |
| `/synthesis` | POST | Receives `{ "transcript": "..." }` → returns AI summary |
| `/hubspot_commands` | POST | Receives `{ "transcript": "..." }` → executes HubSpot actions |

---

## ▶️ Run Locally

```bash
# 1. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate   # (Windows: .venv\Scripts\activate)

# 2. Install dependencies
pip install flask google-cloud-speech google-cloud-storage google-genai requests protobuf

# 3. Start the Flask server
python app.py
```
---

🧑‍💻 Team

Aplication for Hack-Nation IA MIT — Voice-to-Structured CRM Project
Built with ❤️ using Google Cloud and HubSpot APIs

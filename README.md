# Project3000

## 🧠 Voice CRM – Voice-to-Structured CRM
### Hack-Nation’s 3rd Global AI Hackathon Project Submission

## 📹 Demonstration and Technical Videos


https://github.com/user-attachments/assets/bed1996c-6cf8-49a5-b489-67469b4b0817



https://github.com/user-attachments/assets/559cae40-97ae-486a-9e1f-986bac0dc4c0



## 🚀 Overview
### Voice CRM eliminates manual data entry in CRM platforms like HubSpot.
Our prototype uses Google Cloud Speech-to-Text and Gemini (Vertex AI) to turn voice notes and recorded calls into structured CRM entries, automatically creating contacts, notes, deals, and tasks.


## ⚙️ Architecture

### Input → Processing → Output

| Stage | Description | Technology |
|--------|--------------|-------------|
| 🎙️ **Input** | User provides an audio file (voice note, call, memo) | — |
| 🧩 **Speech Recognition** | Audio is transcribed into text | Google Cloud **Speech-to-Text V2** |
| 🧠 **Understanding & Automation** | Text is semantically parsed to detect intent (create contact, note, deal, etc.) | **Gemini 2.5 Flash (Vertex AI)** |
| 🔗 **CRM Integration** | Relevant HubSpot API endpoints are called automatically | **HubSpot CRM API** |
| ✅ **Output** | Contact, Note, Deal, or Task created automatically | — |

---

## 🧩 Project Structure

| Path | Description |
|------|--------------|
| `audio_to_transcript/` | Handles transcription of remote audio using Google Cloud Speech-to-Text |
| `front/` | Frontend interface for audio upload and CRM visualization |
| `server/` | Flask backend handling AI inference and CRM automation |
| `.gitignore` | Git ignore configuration |
| `LICENSE` | Project license |
| `README.md` | This documentation |
| `requirements.txt` | Python dependencies list |

---

## 🧠 Main Workflow (Voice → CRM)

1. User records or uploads an **audio file (.wav or .mp3)**  
2. The **`audio_to_transcript`** module sends it to **Google Cloud Speech-to-Text** for transcription  
3. The transcript is processed by **Gemini**, which determines the CRM intent and triggers HubSpot API calls to:  
   - Create or update a **contact**  
   - Add a **note**  
   - Create a **deal**  
   - Create a **task**  
4. The system returns a concise confirmation message.

---

## 🧰 Tech Stack

| Category | Tool |
|-----------|------|
| AI / NLP | **Google Gemini 2.5 Flash (Vertex AI)** |
| Speech Recognition | **Google Cloud Speech-to-Text V2** |
| Backend | **Flask (Python)** |
| Frontend | **React + Vite (JavaScript)** |
| CRM | **HubSpot API v3 / v4** |
| Cloud | **Google Cloud Run / Cloud Functions** |

---

## ▶️ Run Locally

The project has four main parts:  
1. Speech-to-text API (Google Cloud)
2. Generative AI agentic API for text to HubSpot commands (Gemini)
3. The **backend** (Flask + Python) inside the `server/` folder  
4. The **frontend** (React + Vite) inside the `front/` folder  
5. HubSpot API  

**Obs.: For parts 1, 2, and 5, provide the required API credentials using your preferred method (environment variables, external JSON file, etc.).**  
Follow the steps below to prepare your environment and run both components:

---

### 🧩 1. Backend Setup (Flask API)
```
# Install Python dependencies (from the root folder)
pip install -r requirements.txt

# Start the Flask backend
python -m server.app
```

### 💻 2. Frontend Setup (React + Vite)
```
# Navigate to the frontend folder
cd front

# 1. Install Node.js dependencies
npm install      # or simply: npm i

# 2. Start the local development server
npm run dev
```
By default, Vite will start the frontend at http://localhost:8080/. Make sure the Flask backend is running before testing the interface.

---

## 👥 Team

Project developed for Hack-Nation AI MIT — Voice-to-Structured CRM.
Built with ❤️ using Google Cloud and HubSpot APIs.

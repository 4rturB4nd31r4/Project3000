# pip install google-genai requests
import os, requests
from datetime import datetime
from google import genai
from google.genai import types
from stt_local import speech_to_text

# --- Config ---
GEMINI_MODEL = "gemini-2.5-flash"
HUBSPOT_BASE = "https://api.hubapi.com"
HUBSPOT_TOKEN = os.environ["HUBSPOT_TOKEN"]        # <--- set me
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))  # or use Vertex settings

# ---------- HubSpot helpers ----------
def _hs_headers():
    return {
        "Authorization": f"Bearer {HUBSPOT_TOKEN}",
        "Content-Type": "application/json",
    }

def _search_contact_by_email(email:str):
    url = f"{HUBSPOT_BASE}/crm/v3/objects/contacts/search"
    body = {
        "filterGroups": [{"filters":[{"propertyName":"email","operator":"EQ","value": email}]}],
        "properties": ["email","firstname","lastname","phone"]
    }
    r = requests.post(url, headers=_hs_headers(), json=body, timeout=30)
    r.raise_for_status()
    data = r.json()
    return (data.get("results") or [None])[0]

def _create_contact(properties:dict):
    url = f"{HUBSPOT_BASE}/crm/v3/objects/contacts"
    r = requests.post(url, headers=_hs_headers(), json={"properties":properties}, timeout=30)
    r.raise_for_status()
    return r.json()

def _update_contact(contact_id:str, properties:dict):
    url = f"{HUBSPOT_BASE}/crm/v3/objects/contacts/{contact_id}"
    r = requests.patch(url, headers=_hs_headers(), json={"properties":properties}, timeout=30)
    r.raise_for_status()
    return r.json()

def _create_note(note_body:str):
    # Create the note object
    url = f"{HUBSPOT_BASE}/crm/v3/objects/notes"
    payload = {"properties": {"hs_note_body": note_body}}
    r = requests.post(url, headers=_hs_headers(), json=payload, timeout=30)
    r.raise_for_status()
    return r.json()  # returns {"id": "...", ...}

def _associate_default(from_type:str, from_id:str, to_type:str, to_id:str):
    # v4 "default" unlabeled association (no body needed)
    url = f"{HUBSPOT_BASE}/crm/v4/objects/{from_type}/{from_id}/associations/default/{to_type}/{to_id}"
    r = requests.put(url, headers=_hs_headers(), timeout=30)
    r.raise_for_status()
    return r.json() if r.text else {"ok": True}

def _create_deal(properties:dict):
    url = f"{HUBSPOT_BASE}/crm/v3/objects/deals"
    r = requests.post(url, headers=_hs_headers(), json={"properties":properties}, timeout=30)
    r.raise_for_status()
    return r.json()

def _create_task(properties:dict):
    url = f"{HUBSPOT_BASE}/crm/v3/objects/tasks"
    r = requests.post(url, headers=_hs_headers(), json={"properties":properties}, timeout=30)
    r.raise_for_status()
    return r.json()

# ---------- Tools that Gemini can call ----------
def find_or_create_contact(email: str,
                           first_name: str | None = None,
                           last_name: str | None = None,
                           phone: str | None = None) -> dict:
    """
    Ensure a contact exists. If it exists, update missing fields; otherwise create it.
    Returns: {contact_id, email, was_created}
    """
    existing = _search_contact_by_email(email)
    props = {}
    if first_name: props["firstname"] = first_name
    if last_name:  props["lastname"]  = last_name
    if phone:      props["phone"]     = phone

    if existing and existing.get("id"):
        cid = existing["id"]
        if props:
            _update_contact(cid, props)
        return {"contact_id": cid, "email": email, "was_created": False}

    created = _create_contact({"email": email, **props})
    return {"contact_id": created["id"], "email": email, "was_created": True}

def add_note_to_contact(note_body: str,
                        contact_id: str | None = None,
                        email: str | None = None) -> dict:
    """
    Create a note and associate it to the contact.
    """
    if not contact_id and email:
        res = _search_contact_by_email(email)
        if not res: raise ValueError("Contact not found for email")
        contact_id = res["id"]
    if not contact_id:
        raise ValueError("Need contact_id or email")

    note = _create_note(note_body)
    _associate_default("note", note["id"], "contact", contact_id)
    return {"note_id": note["id"], "contact_id": contact_id}

def create_deal_for_contact(dealname: str,
                            contact_id: str | None = None,
                            email: str | None = None,
                            amount: float | None = None,
                            pipeline: str | None = None,
                            dealstage: str | None = None,
                            close_date_iso: str | None = None) -> dict:
    """
    Create a deal and associate to the contact.
    """
    if not contact_id and email:
        res = _search_contact_by_email(email)
        if not res: raise ValueError("Contact not found for email")
        contact_id = res["id"]
    properties = {"dealname": dealname}
    if amount is not None:        properties["amount"] = amount
    if pipeline:                  properties["pipeline"] = pipeline
    if dealstage:                 properties["dealstage"] = dealstage
    if close_date_iso:            properties["closedate"] = close_date_iso

    deal = _create_deal(properties)
    if contact_id:
        _associate_default("deal", deal["id"], "contact", contact_id)
    return {"deal_id": deal["id"], "contact_id": contact_id}

def create_task_for_contact(subject: str,
                            due_datetime_iso: str,
                            body: str | None = None,
                            contact_id: str | None = None,
                            email: str | None = None,
                            priority: str | None = "MEDIUM") -> dict:
    """
    Create a task (engagement) and associate to the contact.
    """
    if not contact_id and email:
        res = _search_contact_by_email(email)
        if not res: raise ValueError("Contact not found for email")
        contact_id = res["id"]

    props = {
        "hs_task_subject": subject,
        "hs_timestamp": due_datetime_iso,  # ISO8601
    }
    if body:     props["hs_task_body"] = body
    if priority: props["hs_task_priority"] = priority  # LOW/MEDIUM/HIGH

    task = _create_task(props)
    if contact_id:
        _associate_default("task", task["id"], "contact", contact_id)
    return {"task_id": task["id"], "contact_id": contact_id}

# ---------- Agent wrapper ----------
def run_crm_agent(transcript: str) -> str:
    """
    Sends the user transcript to Gemini; the model will call the right tool(s).
    Returns a friendly confirmation message to show the user/agent log.
    """
    tools = [find_or_create_contact, add_note_to_contact,
             create_deal_for_contact, create_task_for_contact]

    system = (
        "You are a CRM assistant for HubSpot. "
        "Decide the user's intent and ONLY call the minimal set of tools needed. "
        "Common intents: create/update contact, add note, create deal, create task. "
        "Prefer email to find contacts. Produce concise confirmations."
    )

    resp = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=transcript,
        config=types.GenerateContentConfig(
            system_instruction=system,
            tools=tools,  # automatic function calling
            # Optional: force tool-use first
            # tool_config=types.ToolConfig(
            #   function_calling_config=types.FunctionCallingConfig(mode='ANY')
            # )
        ),
    )
    return resp.text

def record_audio(output_file: str, duration: float, samplerate: int = 16000, channels: int = 1) -> str:
    """Record audio from the default microphone and save as a WAV file.

    Args:
        output_file (str): Path to save the recorded WAV file.
        duration (float): Recording duration in seconds.
        samplerate (int, optional): Sampling rate in Hz. Defaults to 16000.
        channels (int, optional): Number of channels. Defaults to 1 (mono).

    Returns:
        str: Path to the saved audio file.
    """
    import sounddevice as sd
    import soundfile as sf
    from pathlib import Path
    if duration <= 0:
        raise ValueError("duration must be a positive number")

    out_path = Path(output_file)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"Recording {duration} seconds to {out_path}...")
    try:
        frames = int(duration * samplerate)
        recording = sd.rec(frames, samplerate=samplerate, channels=channels, dtype="int16")
        sd.wait()
        sf.write(out_path, recording, samplerate, subtype="PCM_16")
    except Exception as exc:
        raise RuntimeError(f"Failed to record audio: {exc}") from exc

    print("Recording finished.")
    return str(out_path)

# ---- Example: wire up your STT output ----
def voice_to_hubspot_pipeline():
    # You already have:
    text = speech_to_text("file")  # <-- your function
    print("User said:", text)
    try:
        result = run_crm_agent(text)
    except Exception as e:
        result = f"Error running agent: {e}"
    print("Agent:", result)

# ---------- Quick string-based tests (no audio needed) ----------
def test_with_strings():
    # These are natural-language transcripts like what STT would produce.
    tests = [
        # 1) Find-or-create a contact
        "New contact: Jane Doe, email jane@acme.com, phone +1 415 555 0199.",

        # 2) Add a note to that contact
        "Add a note for jane@acme.com: asked for the pricing doc, follow up Monday.",

        # 3) Create a task (natural language time)
        "Create a task for jane@acme.com due tomorrow at 3pm: send proposal.",

        # 4) Create a deal with specific details
        "Open a $9,500 deal called Q1 Expansion for jane@acme.com in the Sales Pipeline at stage presentationscheduled, close on 2025-12-15.",

        # 5) Another example using full ISO date/time
        "Create a task for jane@acme.com due 2025-11-12T15:00:00Z: schedule demo with engineering."
    ]

    for i, t in enumerate(tests, start=1):
        print("\n" + "="*70)
        print(f"TEST {i}: {t}")
        try:
            result = run_crm_agent(t)   # <-- directly pass the string transcript
            print("Agent:", result)
        except Exception as e:
            print("Error:", e)

if __name__ == "__main__":
    import tempfile, os
    from pathlib import Path
    # This will run real HubSpot API calls.
    #test_with_strings()
    # Quick interactive test: record 10 seconds of audio, transcribe it and run the agent
    print("\n" + "="*70)
    print("RECORD-AUDIO TEST: recording 10 seconds...")
    # Save to a persistent file instead of a temporary one
    out_dir = Path(__file__).resolve().parent / "recordings"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "last_recording.wav"

    print(f"Recording will be saved to: {out_path}")
    record_audio(str(out_path), duration=10.0)

    text = speech_to_text(str(out_path))
    print("Transcribed text:", text)

    try:
        result = run_crm_agent(text)
    except Exception as e:
        result = f"Error running agent: {e}"
    print("Agent:", result)

    # Note: file is kept (not deleted) in ~/recordings/last_recording.wav

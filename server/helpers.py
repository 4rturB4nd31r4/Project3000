from environment.vars import *
import requests
from werkzeug.utils import secure_filename
import time
import uuid

def make_object_name(filename: str) -> str:
    base = secure_filename(filename) or "audio.webm"
    ts = int(time.time())
    uid = uuid.uuid4().hex[:8]
    return f"audio-uploads/{ts}-{uid}-{base}"

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
    url = f"{HUBSPOT_BASE}/crm/v3/objects/notes"
    payload = {"properties": {"hs_note_body": note_body}}
    r = requests.post(url, headers=_hs_headers(), json=payload, timeout=30)
    r.raise_for_status()
    return r.json()

def _associate_default(from_type:str, from_id:str, to_type:str, to_id:str):
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

def find_or_create_contact(email: str,
                           first_name: str | None = None,
                           last_name: str | None = None,
                           phone: str | None = None) -> dict:
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

    if not contact_id and email:
        res = _search_contact_by_email(email)
        if not res: raise ValueError("Contact not found for email")
        contact_id = res["id"]
    props = {
        "hs_task_subject": subject,
        "hs_timestamp": due_datetime_iso,
    }
    if body:     props["hs_task_body"] = body
    if priority: props["hs_task_priority"] = priority
    task = _create_task(props)
    if contact_id:
        _associate_default("task", task["id"], "contact", contact_id)
    return {"task_id": task["id"], "contact_id": contact_id}
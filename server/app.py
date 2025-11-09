from flask import Flask, render_template, request, jsonify
from audio_to_transcript.audio_to_transcript import audio_to_transcript
from env.vars import PROMPT_SYNTHESIS, PROMPT_HUBSPOT_COMMANDS, HUBSPOT_COMMANDS_SCHEMA, GEMINI_API_KEY, BUCKET_NAME
from google import genai
from google.genai import types
import json
import requests
from server.helpers import *
from google.cloud import storage
import os
from google.oauth2 import service_account
from flask_cors import CORS
from google.cloud.speech_v2 import SpeechClient
from google.cloud.speech_v2.types import cloud_speech


app = Flask(__name__)

CORS(
    app,
    resources={r"/*": {"origins": ["*"]}},
    supports_credentials=True,
)

SA_PATH = "/home/artur/Documents/hackathon2/Project3000/global-bee-477618-k3-706ca65dcf8f.json" 
creds = service_account.Credentials.from_service_account_file(SA_PATH)
storage_client = storage.Client(credentials=creds)
bucket = storage_client.bucket(BUCKET_NAME)

@app.route('/')
def index():
    return "Hello World"

@app.route('/audio_to_transcript', methods = ['POST'])
def audio_to_transcript():
    print("cheguei no audio_to_transcript")
    request_body = request.get_json()
    gs_audio_uri = request_body['audio_url']
    storage_client = storage.Client()
    blob = storage.Blob.from_string(gs_audio_uri, client=storage_client)
    audio_bytes = blob.download_as_bytes()  

    PROJECT_ID = "global-bee-477618-k3"
    LOCATION = "global"  
    RECOGNIZER = f"projects/{PROJECT_ID}/locations/{LOCATION}/recognizers/_"

    client = SpeechClient()
    req = cloud_speech.RecognizeRequest(
        recognizer=RECOGNIZER,
        config=cloud_speech.RecognitionConfig(
            auto_decoding_config={},
            language_codes=["pt-BR"],
            features=cloud_speech.RecognitionFeatures(
                enable_word_confidence=True,
                enable_word_time_offsets=True,
            ),
            model="long",
        ),
        content=audio_bytes,
    )
    resp = client.recognize(request=req)

    best, best_conf = "", -1.0
    for r in resp.results:
        for alt in r.alternatives:
            if alt.confidence > best_conf:
                best_conf = alt.confidence
                best = alt.transcript
    print("transcription realizado com sucesso!")
    if best_conf < 0.50:
        return jsonify({'transcription': 'Repeat', 'success': False})
    return jsonify({'transcription': best, 'success': True})

@app.route('/synthesis', methods = ['POST'])
def synthesis():
    if request.method == 'POST':
        try:
            print("cheguei no synthesis")
            request_body = request.get_json()
            print(request_body)
            transcript = request_body['transcript']
            client = genai.Client(api_key=GEMINI_API_KEY)
            print("por enquanto ok")
            response = client.models.generate_content(
              model="gemini-2.5-flash",
              contents=[
                {"role": "user", "parts": [{"text": f"{PROMPT_SYNTHESIS}\n\n---\n\nUser transcript:\n{transcript}"}]},
              ],
            )
            print("synthesis realizado com sucesso!")
            print(response.text)
            print(type(response.text))
            return jsonify({'result': response.text, 'success': True})
        except Exception as e:
            print("erro no synthesis")
            return jsonify({'result': str(e), 'success': False})
    else:
        raise Exception('Invalid request method')

@app.route('/hubspot_commands', methods = ['POST'])
def hubspot_commands():
    if request.method == 'POST':
        try:
            request_body = request.get_json()
            transcript = request_body['transcript']
            print(transcript)
            tools = [find_or_create_contact, add_note_to_contact,
            create_deal_for_contact, create_task_for_contact]
            system = PROMPT_HUBSPOT_COMMANDS
            client = genai.Client(api_key=GEMINI_API_KEY)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=transcript + "I am debugging this code, so please be a verbouse in the output",
                config=types.GenerateContentConfig(
                system_instruction=system,
                tools=tools
            ),
        )
            print("hubspot_commands realizado com sucesso!")
            print(response.text)
            return jsonify({'result': response.text, 'success': True})
        except Exception as e:
            print("erro no hubspot_commands")
            return jsonify({'result': str(e), 'success': False})
    else:
        raise Exception('Invalid request method')

@app.route('/upload-audio', methods = ['POST'])
def upload_audio():
    if "audio" not in request.files:
        return jsonify({"success": False, "error": "missing file field 'audio'"}), 400

    file = request.files["audio"]
    obj_name = make_object_name(file.filename)

    blob = bucket.blob(obj_name)
    content_type = file.mimetype or "application/octet-stream"

    blob.upload_from_file(file.stream, content_type=content_type)

    gs_uri = f"gs://{BUCKET_NAME}/{obj_name}"

    signed_url = blob.generate_signed_url(version="v4", expiration=3600, method="GET")
    print("upload realizado com sucesso!")
    return jsonify({
        "success": True,
        "bucket": BUCKET_NAME,
        "object": obj_name,
        "gs_uri": gs_uri,
        "signed_url": signed_url
    }), 200


if __name__ == '__main__':
    app.run(debug=True)
from flask import Flask, render_template, request, jsonify
from audio_to_transcript.audio_to_transcript import audio_to_transcript
from env.vars import PROMPT_SYNTHESIS, PROMPT_HUBSPOT_COMMANDS, HUBSPOT_COMMANDS_SCHEMA, GEMINI_API_KEY
from google import genai
from google.genai import types
import json
import requests
from server.helpers import *

app = Flask(__name__)

@app.route('/')
def index():
    return "Hello World"

@app.route('/audio_to_transcript', methods = ['POST'])
def audio_to_trancript():
    if request.method == 'POST':
        request_body = request.get_json()
        audio_url = request_body['audio_url']
        success, transcript = audio_to_transcript(audio_url)
        return jsonify({'result': transcript, 'success': success})
    else:
        raise Exception('Invalid request method')

@app.route('/synthesis', methods = ['POST'])
def synthesis():
    if request.method == 'POST':
        try:
            request_body = request.get_json()
            transcript = request_body['transcript']
            client = genai.Client(api_key=GEMINI_API_KEY)
            response = client.models.generate_content(
              model="gemini-2.5-flash",
              contents=[
                {"role": "user", "parts": [{"text": f"{PROMPT_SYNTHESIS}\n\n---\n\nUser transcript:\n{transcript}"}]},
              ],
            )
            return jsonify({'result': response.text, 'success': True})
        except Exception as e:
            return jsonify({'result': str(e), 'success': False})
    else:
        raise Exception('Invalid request method')

@app.route('/hubspot_commands', methods = ['POST'])
def hubspot_commands():
    if request.method == 'POST':
        try:
            request_body = request.get_json()
            transcript = request_body['transcript']
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
            return jsonify({'result': response.text, 'success': True})
        except Exception as e:
            return jsonify({'result': str(e), 'success': False})
    else:
        raise Exception('Invalid request method')

if __name__ == '__main__':
    app.run(debug=True)
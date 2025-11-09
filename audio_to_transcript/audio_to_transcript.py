from google.cloud.speech_v2 import SpeechClient
from google.cloud.speech_v2.types import cloud_speech
from google.cloud import storage
import json, io, os
from google.protobuf.json_format import MessageToDict

MAX_AUDIO_LENGTH_SECS = 8 * 60 * 60


def run_batch_recognize(audio_url):
  client = SpeechClient()
  gcs_output_folder = "gs://audio_to_transcript123/transcripts"
  config = cloud_speech.RecognitionConfig(
      auto_decoding_config={},
      features=cloud_speech.RecognitionFeatures(
          enable_word_confidence=True,
          enable_word_time_offsets=True,
        ),
      model="long",
      language_codes=["pt-BR"],
  )

  output_config = cloud_speech.RecognitionOutputConfig(
      gcs_output_config=cloud_speech.GcsOutputConfig(uri=gcs_output_folder),
  )

  files = [cloud_speech.BatchRecognizeFileMetadata(uri=audio_url)]

  request = cloud_speech.BatchRecognizeRequest(
      recognizer="projects/scenic-era-477618-k8/locations/global/recognizers/_",
      config=config,
      files=files,
      recognition_output_config=output_config,
  )
  operation = client.batch_recognize(request=request)
  response = operation.result(timeout=3 * MAX_AUDIO_LENGTH_SECS)
  return response

def audio_to_transcript(audio_url):
    response = run_batch_recognize(audio_url)
    response_dict = MessageToDict(response._pb)
    result = response_dict["results"]
    first_key, first_value = next(iter(result.items()))
    BUCKET = "audio_to_transcript123"
    BLOB = first_value["cloudStorageResult"]["uri"]
    client = storage.Client()
    bucket = client.bucket(BUCKET)
    blob = storage.Blob.from_string(BLOB, client=client)
    raw = blob.download_as_bytes()
    data = json.loads(raw)
    confidence = 0
    transcript = ''
    for alternative in data["results"][0]["alternatives"]:
        if(alternative["confidence"] > confidence):
            confidence = alternative["confidence"]
            transcript = alternative["transcript"]
    if(confidence < 0.50):
        return False, 'Repeat'
    return True, transcript



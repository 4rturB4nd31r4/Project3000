import requests
import json

# 1. Place your Private App Access Token here
ACCESS_TOKEN = "XXXXXXXX" # Change here

# 2. The endpoint to CREATE contacts is the same as LISTING
endpoint = "https://api.hubapi.com/crm/v3/objects/contacts"

# 3. Set up the authorization header
#    We add 'Content-Type' to tell the API we are sending JSON
headers = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Content-Type": "application/json"
}

# 4. Define the data (payload) for the new contact we want to create
#    You can change these values!
new_contact_data = {
    "properties": {
        "email": "contato.novo.api@teste.com",
        "firstname": "Maria",
        "lastname": "Silva"
    }
}

try:
    print("Attempting to create a new contact...")
    
    # 5. Make the POST request to the API
    #    We use requests.post() and pass the data with the 'json' parameter
    response = requests.post(endpoint, headers=headers, json=new_contact_data)
    
    # Check if the request failed (e.g., token, permission, duplicate email)
    response.raise_for_status() 

    # 6. If the request was successful (Status 201 Created)
    print("\nContact created successfully!")
    
    # Convert the response (which is the new contact) into a dictionary
    data = response.json()

    # Print the results in a readable format
    print(json.dumps(data, indent=2))

except requests.exceptions.HTTPError as err:
    print(f"HTTP Error: {err}")
    # The API error response is very useful for debugging
    print(f"API Response: {err.response.text}")
except Exception as err:
    print(f"An error occurred: {err}")
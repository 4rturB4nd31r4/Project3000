import requests
import json

# 1. Place your Private App Access Token here
ACCESS_TOKEN = "XXXXXXXX" # Change here

# 2. Define the API endpoint to list contacts
# We are using version 3 (v3) of the API
endpoint = "https://api.hubapi.com/crm/v3/objects/contacts"

# 3. Set up the authorization header
# The API expects a "Bearer token"
headers = {
    "Authorization": f"Bearer {ACCESS_TOKEN}"
}

try:
    # 4. Make the GET request to the API
    response = requests.get(endpoint, headers=headers)
    
    # Check if the request failed (e.g., wrong token, lack of permission)
    response.raise_for_status() 

    # 5. If the request was successful (status 200 OK)
    print("Connection successful!")
    
    # Convert the JSON response into a Python dictionary
    data = response.json()
    print(data)
    
    # Print the results in a readable format
    print(json.dumps(data, indent=2))

    # Optional: List only the email of the contacts found
    print("\n--- List of Contact Emails ---")
    if data.get("results"):
        for contact in data["results"]:
            email = contact.get("properties", {}).get("email")
            if email:
                print(email)
    else:
        print("No contacts found.")

except requests.exceptions.HTTPError as err:
    print(f"HTTP Error: {err}")
    print(f"API Response: {err.response.text}")
except Exception as err:
    print(f"An error occurred: {err}")
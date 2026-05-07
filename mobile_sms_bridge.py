import requests
import time
import json

# ==============================================================================
# RESEARCH CONCEPT: NATIVE MOBILE SMS BACKGROUND LISTENER
# ==============================================================================
# This script simulates what a native Android app (written in Kotlin/Java) 
# or an automation tool like MacroDroid/Tasker does in the background.
# 
# 1. It listens to the phone's OS for a "SMS_RECEIVED" broadcast.
# 2. It grabs the text and immediately fires an HTTP POST to our API webhook.
# ==============================================================================

# Your backend API URL
API_URL = "http://127.0.0.1:8000/api/transactions/sms"

# To do this securely, the mobile app needs the user's JWT token
# For this simulation, paste a valid Bearer token from your frontend
USER_JWT_TOKEN = "PASTE_YOUR_TOKEN_HERE"

def on_sms_received(sender, sms_text):
    print(f"\n📱 [OS Level] New SMS received from {sender}!")
    print(f"✉️  Content: '{sms_text}'")
    
    print("🚀 [Background Service] Automatically pushing to FinSight AI Webhook...")
    
    headers = {
        "Authorization": f"Bearer {USER_JWT_TOKEN}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "sms_text": sms_text
    }
    
    try:
        response = requests.post(API_URL, json=payload, headers=headers)
        
        if response.status_code == 200:
            print("✅ [Success] AI Processed it! Transaction added to dashboard in real-time.")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"❌ [Failed] Error {response.status_code}: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ [Failed] Could not connect to backend. Is uvicorn running?")

if __name__ == "__main__":
    print("🔋 Mobile Background SMS Listener is running... Waiting for bank texts.")
    print("---------------------------------------------------------------------")
    
    # Simulating a user buying coffee after 3 seconds
    time.sleep(3)
    on_sms_received(
        "ComBank", 
        "LKR 850.00 was debited from A/C xxxxxx8812 at JAVA LOUNGE COLOMBO on 23-04-2026 09:15. Ref: 987654"
    )
    
    # Simulating a salary deposit after 5 seconds
    time.sleep(5)
    on_sms_received(
        "BOC", 
        "LKR 150,000.00 credited to your A/C 11223344 as SALARY from ACME CORP. Avl Bal: LKR 185,200.00"
    )

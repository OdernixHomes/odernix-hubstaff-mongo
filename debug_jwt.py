#!/usr/bin/env python3
import jwt
import sys
import json

# From the error log, here's the token being sent
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiaWd0ZWVmbGVub3J5QGdtYWlsLmNvbSIsInVzZXJfaWQiOiJiZThlYTdmMS1jZWFjLTRmZDktOTBhNi0yZjZkNzgzNTJjYjQiLCJvcmdfaWQiOiJjMWRkNGYzYS0wZjkyLTQxYTktYTJiNC1hMGZiMGVmNjYxM2YiLCJleHAiOjE3NTUxODMwNjZ9.pqzmpsPl7jm9LLGZ3W3TY6RrcU-I_m7LpQjeXzAZEzA"

try:
    # Decode without verification to see payload
    decoded = jwt.decode(token, options={"verify_signature": False})
    print("Token payload:")
    print(json.dumps(decoded, indent=2))
    
    print("\nExpiration check:")
    import time
    current_time = time.time()
    exp_time = decoded.get('exp', 0)
    print(f"Current time: {current_time}")
    print(f"Token exp: {exp_time}")
    print(f"Is expired: {current_time > exp_time}")
    
except Exception as e:
    print(f"Error decoding token: {e}")
import json
import os
import re
from main import app, allowed_origins

def audit_mobile_readiness():
    spec = app.openapi()
    
    # Save the current openapi.json
    with open("openapi.json", "w", encoding="utf-8") as f:
        json.dump(spec, f, indent=2)
    print(f"Saved current openapi.json (Total paths: {len(spec.get('paths', {}))})")
    
    paths = spec.get("paths", {})
    total_endpoints = sum(len([m for m in methods if m.lower() in ['get', 'post', 'put', 'patch', 'delete']]) for methods in paths.values())
    
    missing_response_models = []
    for path, methods in paths.items():
        for method, op in methods.items():
            if method.lower() not in ['get', 'post', 'put', 'patch', 'delete']:
                continue
            responses = op.get("responses", {})
            success_responses = [k for k in responses.keys() if k.startswith('2')]
            if not success_responses:
                missing_response_models.append(f"{method.upper()} {path} (No success status code)")
            else:
                for sr in success_responses:
                    content = responses[sr].get('content', {})
                    if 'application/json' not in content:
                        if path != '/api/certificates/verify/{certificate_id}':
                            missing_response_models.append(f"{method.upper()} {path} ({sr} has no application/json)")
    
    print(f"\nTotal endpoints inspected: {total_endpoints}")
    print(f"Endpoints missing structured JSON response models: {len(missing_response_models)}")
    for m in missing_response_models[:10]:
        print(f"  - {m}")
        
    # Check Auth Flow for Mobile Readiness
    print("\n--- Auth Flow Check ---")
    auth_endpoints = ['/api/auth/login', '/api/auth/register', '/api/auth/google', '/api/users/me']
    for ep in auth_endpoints:
        if ep in paths:
            print(f"[{ep}]: PRESENT in schema.")
            for m, op in paths[ep].items():
                if m.lower() in ['post', 'get']:
                    resp = op.get('responses', {}).get('200', {}) or op.get('responses', {}).get('201', {})
                    print(f"  -> {m.upper()} response description: {resp.get('description', 'OK')}")
        else:
            print(f"[{ep}]: NOT found in schema!")
            
    # Check CORS Configuration
    print("\n--- CORS & Network Check ---")
    print(f"Current ALLOWED_ORIGINS env: {os.getenv('ALLOWED_ORIGINS')}")
    print(f"Active allow_origins in middleware: {allowed_origins}")
    
    # Check if Starlette CORSMiddleware has regex or broad origin support
    has_regex = False
    for middleware in app.user_middleware:
        if 'CORSMiddleware' in str(middleware.cls):
            kwargs = middleware.kwargs
            print(f"CORSMiddleware configured kwargs: {kwargs}")
            if kwargs.get('allow_origin_regex'):
                has_regex = True
                
    if not has_regex and allowed_origins == ['http://localhost:3000', 'http://127.0.0.1:3000']:
        print("CORS WARNING: Only localhost:3000 is currently allowed. When accessing from a physical mobile device or Expo tunnel, requests will fail CORS preflight if Origin header is sent.")
    else:
        print("CORS status: OK or broad origin regex enabled.")

if __name__ == '__main__':
    audit_mobile_readiness()

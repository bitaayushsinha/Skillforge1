import json
from collections import defaultdict

from main import app
from fastapi.openapi.utils import get_openapi

def analyze_openapi():
    spec = app.openapi()
    
    paths = spec.get('paths', {})
    
    inconsistent_responses = []
    missing_response_models = []
    camel_case_fields = set()
    snake_case_fields = set()
    auth_issues = []
    
    for path, methods in paths.items():
        for method, op in methods.items():
            if method.lower() not in ['get', 'post', 'put', 'patch', 'delete']:
                continue
                
            responses = op.get('responses', {})
            # Check for 200 response model
            success_responses = [k for k in responses.keys() if k.startswith('2')]
            if not success_responses:
                missing_response_models.append(f"{method.upper()} {path} (No success response)")
            else:
                for sr in success_responses:
                    content = responses[sr].get('content', {})
                    if 'application/json' not in content:
                        if path != '/api/certificates/verify/{certificate_id}': # Exception for HTML
                            missing_response_models.append(f"{method.upper()} {path} (No JSON response content)")
                    else:
                        schema = content['application/json'].get('schema', {})
                        if not schema.get('$ref') and not (schema.get('type') == 'array' and schema.get('items', {}).get('$ref')):
                            if 'properties' not in schema and 'allOf' not in schema:
                                missing_response_models.append(f"{method.upper()} {path} (Raw dict/inline schema instead of model ref)")
            
            # Check for generic 422 vs specific errors
            # Look at security
            if 'security' not in op:
                # Is it explicitly public? 
                pass

    # check schemas
    schemas = spec.get('components', {}).get('schemas', {})
    for s_name, schema in schemas.items():
        props = schema.get('properties', {})
        for p in props:
            if '_' in p:
                snake_case_fields.add(p)
            elif p != p.lower():
                camel_case_fields.add(p)

    print("Missing/Raw Response Models:")
    for m in missing_response_models[:20]:
        print("-", m)
    if len(missing_response_models) > 20:
        print(f"...and {len(missing_response_models) - 20} more")
        
    print("\nCase Mixing in Schemas:")
    print(f"Snake case fields: {len(snake_case_fields)} examples: {list(snake_case_fields)[:5]}")
    print(f"Camel case fields: {len(camel_case_fields)} examples: {list(camel_case_fields)[:5]}")

if __name__ == '__main__':
    analyze_openapi()

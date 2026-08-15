import os
import re

routes_dir = "routes"
files_to_check = [os.path.join(routes_dir, f) for f in os.listdir(routes_dir) if f.endswith(".py")]
files_to_check.append("main.py")

for filepath in files_to_check:
    if not os.path.exists(filepath): continue
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    lines = content.split('\n')
    new_lines = []
    modified = False
    
    for i, line in enumerate(lines):
        match = re.search(r'@(router|app)\.(get|post|put|delete)\([^\)]*\)', line)
        if match:
            if 'response_model' not in line:
                # Look ahead 10 lines to see if it returns something like {"success": True}
                lookahead = "\n".join(lines[i:i+20])
                if "return {\"success\"" in lookahead or "return {'success'" in lookahead:
                    model = "schemas.SuccessResponse"
                elif "return {\"status\"" in lookahead or "return {'status'" in lookahead:
                    model = "schemas.ActionStatusResponse"
                elif "return {\"message\"" in lookahead or "return {'message'" in lookahead:
                    model = "schemas.MessageResponse"
                else:
                    model = "schemas.ActionStatusResponse" # fallback
                
                if line.endswith(')'):
                    line = line[:-1] + f', response_model={model})'
                elif line.endswith('):'):
                    line = line[:-2] + f', response_model={model}):'
                modified = True
        new_lines.append(line)
        
    if modified:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write('\n'.join(new_lines))
        print(f"Updated {filepath}")

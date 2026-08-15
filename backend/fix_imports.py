import os
import re

routes_dir = "routes"
files_to_check = [os.path.join(routes_dir, f) for f in os.listdir(routes_dir) if f.endswith(".py")]
files_to_check.append("main.py")

for filepath in files_to_check:
    if not os.path.exists(filepath): continue
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    if "schemas" in content and "import schemas" not in content and "from schemas import" not in content:
        # Add import schemas at the top, after the first few imports
        lines = content.split('\n')
        # Insert after first import
        for i, line in enumerate(lines):
            if line.startswith("import ") or line.startswith("from "):
                lines.insert(i, "import schemas")
                break
        with open(filepath, "w", encoding="utf-8") as f:
            f.write('\n'.join(lines))
        print(f"Added import schemas to {filepath}")

# Fix duplicate get_experts in main.py
main_path = "main.py"
with open(main_path, "r", encoding="utf-8") as f:
    main_content = f.read()
    
# Wait, let's find duplicate definition
# if we have two get_experts, just comment out the second one? Or if it's identical?
# Actually, analyze_openapi just said "Duplicate Operation ID". I can just change the operation_id of one if needed.
# But it's easier to just do it manually.

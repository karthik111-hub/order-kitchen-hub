import os

# Read first 35 lines of server.py
with open('app-main/backend/server.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find and replace the load_dotenv section
new_lines = []
i = 0
while i < len(lines):
    if i == 28 and 'load_dotenv(ROOT_DIR' in lines[i]:
        # Replace load_dotenv line
        new_lines.append('# Only load .env locally (not in Railway/production)\n')
        new_lines.append('# Railway sets env vars directly via dashboard\n')
        new_lines.append('if not os.environ.get("RAILWAY_ENVIRONMENT"):\n')
        new_lines.append('    load_dotenv(ROOT_DIR / ".env")\n')
        i += 1
    elif i == 30 and 'mongo_url = os.environ' in lines[i]:
        # Add logging after mongo_url assignment
        new_lines.append(lines[i])  # mongo_url = os.environ['MONGO_URL']
        i += 1
        new_lines.append(lines[i])  # client = ...
        i += 1
        new_lines.append(lines[i])  # db = ...
        i += 1
        # Add new logging
        new_lines.append('\n')
        new_lines.append('# Log environment config\n')
        new_lines.append('logger.info(f"Environment setup: MONGO_URL={mongo_url[:50]}...")\n')
        new_lines.append('logger.info(f"Database name: {os.environ[\'DB_NAME\']}")\n')
        new_lines.append('logger.info(f"Railway environment: {os.environ.get(\'RAILWAY_ENVIRONMENT\', \'local\')}")\n')
    else:
        new_lines.append(lines[i])
        i += 1

with open('app-main/backend/server.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Updated backend/server.py to skip .env on Railway')

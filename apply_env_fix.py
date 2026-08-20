import re

with open('app-main/backend/server.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace load_dotenv section
old_code = """ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ROLE_PASSWORDS = {
    "admin": os.environ.get("ADMIN_PASSWORD", ""),
    "master": os.environ.get("MASTER_PASSWORD", ""),
    "chef": os.environ.get("CHEF_PASSWORD", ""),
}"""

new_code = """ROOT_DIR = Path(__file__).parent
# Only load .env locally (not in Railway/production)
# Railway sets env vars directly via dashboard
if not os.environ.get("RAILWAY_ENVIRONMENT"):
    load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Log environment at startup
logger.info(f"Environment: RAILWAY_ENVIRONMENT={os.environ.get('RAILWAY_ENVIRONMENT', 'NOT_SET')}")
logger.info(f"Loaded DB_NAME: {os.environ.get('DB_NAME', 'NOT_SET')}")
logger.info(f"Loaded ADMIN_PASSWORD: {os.environ.get('ADMIN_PASSWORD', 'NOT_SET')}")

ROLE_PASSWORDS = {
    "admin": os.environ.get("ADMIN_PASSWORD", ""),
    "master": os.environ.get("MASTER_PASSWORD", ""),
    "chef": os.environ.get("CHEF_PASSWORD", ""),
}
logger.info(f"Passwords loaded - Admin: {bool(ROLE_PASSWORDS['admin'])}, Master: {bool(ROLE_PASSWORDS['master'])}, Chef: {bool(ROLE_PASSWORDS['chef'])}")"""

content = content.replace(old_code, new_code)

with open('app-main/backend/server.py', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated server.py')

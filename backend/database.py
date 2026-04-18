import os
from motor.motor_asyncio import AsyncIOMotorClient

# serverSelectionTimeoutMS=3000: in production (Mongo Atlas) DNS/TLS handshake
# can be slow; 3s timeout prevents indefinite hangs on every operation and
# lets the health endpoint / API return fast failures instead of stalling.
client = AsyncIOMotorClient(
    os.environ['MONGO_URL'],
    serverSelectionTimeoutMS=3000,
)
db = client[os.environ['DB_NAME']]

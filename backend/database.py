import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_FALLBACK_URL = os.getenv("MONGODB_FALLBACK_URL", "mongodb://localhost:27017")
ALLOW_LOCAL_FALLBACK = os.getenv("ALLOW_LOCAL_MONGO_FALLBACK", "true").lower() in {"1", "true", "yes", "on"}


def _mask_mongo_url(url: str) -> str:
	if "@" not in url:
		return url
	prefix, suffix = url.split("@", 1)
	if "://" in prefix:
		scheme, credentials = prefix.split("://", 1)
		return f"{scheme}://***:***@{suffix}"
	return f"***@{suffix}"


def _build_client(url: str) -> AsyncIOMotorClient:
	print(f"🔌 Using MongoDB URL: {_mask_mongo_url(url)}", file=sys.stdout)
	return AsyncIOMotorClient(url)


client = _build_client(MONGODB_URL)
db = client.financewise
transactions_collection = db.get_collection("transactions")
users_collection = db.get_collection("users")


def switch_to_fallback_client() -> bool:
	global client, db, transactions_collection, users_collection

	if not ALLOW_LOCAL_FALLBACK:
		return False

	if MONGODB_URL == MONGODB_FALLBACK_URL:
		return False

	print("⚠️  Falling back to local MongoDB after primary connection failure.", file=sys.stdout)
	client = _build_client(MONGODB_FALLBACK_URL)
	db = client.financewise
	transactions_collection = db.get_collection("transactions")
	users_collection = db.get_collection("users")
	return True

import logging
import os
from collections import defaultdict
from typing import Any, Iterable

from bson import ObjectId
import mongomock
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_default_client: Any = None


class InMemoryCursor:
    def __init__(self, docs: Iterable[dict], sort_field: str | None = None, sort_direction: int = 1):
        self._docs = list(docs)
        self._sort_field = sort_field
        self._sort_direction = sort_direction
        if sort_field:
            self._docs = sorted(self._docs, key=lambda doc: doc.get(sort_field, ""), reverse=sort_direction < 0)

    def sort(self, field: str, direction: int = 1):
        self._docs = sorted(self._docs, key=lambda doc: doc.get(field, ""), reverse=direction < 0)
        self._sort_field = field
        self._sort_direction = direction
        return self

    def __aiter__(self):
        self._iterator = iter(self._docs)
        return self

    async def __anext__(self):
        try:
            return next(self._iterator)
        except StopIteration:
            raise StopAsyncIteration


class AsyncInMemoryCollection:
    def __init__(self, store: dict[str, list[dict]], name: str):
        self._store = store
        self._name = name

    def _documents(self) -> list[dict]:
        return self._store.setdefault(self._name, [])

    async def find_one(self, query: dict[str, Any] | None = None, **_: Any):
        query = query or {}
        for doc in self._documents():
            if all(doc.get(key) == value for key, value in query.items()):
                return doc
        return None

    async def insert_one(self, document: dict[str, Any]):
        document = dict(document)
        document.setdefault("_id", ObjectId())
        self._documents().append(document)
        return type("InsertOneResult", (), {"inserted_id": document["_id"]})()

    async def insert_many(self, documents: list[dict[str, Any]]):
        inserted_ids = []
        for document in documents:
            result = await self.insert_one(document)
            inserted_ids.append(result.inserted_id)
        return type("InsertManyResult", (), {"inserted_ids": inserted_ids})()

    async def update_one(self, query: dict[str, Any], update: dict[str, Any], **_: Any):
        matched = 0
        for doc in self._documents():
            if all(doc.get(key) == value for key, value in query.items()):
                matched += 1
                updates = update.get("$set", {}) if isinstance(update, dict) else {}
                doc.update(updates)
                break
        return type("UpdateResult", (), {"matched_count": matched})()

    async def update_many(self, query: dict[str, Any], update: dict[str, Any], **_: Any):
        updated = 0
        for doc in self._documents():
            if all(doc.get(key) == value for key, value in query.items()):
                updated += 1
                updates = update.get("$set", {}) if isinstance(update, dict) else {}
                doc.update(updates)
        return type("UpdateResult", (), {"matched_count": updated})()

    async def delete_one(self, query: dict[str, Any]):
        docs = self._documents()
        for idx, doc in enumerate(docs):
            if all(doc.get(key) == value for key, value in query.items()):
                del docs[idx]
                return type("DeleteResult", (), {"deleted_count": 1})()
        return type("DeleteResult", (), {"deleted_count": 0})()

    async def delete_many(self, query: dict[str, Any]):
        docs = self._documents()
        remaining = []
        deleted = 0
        for doc in docs:
            if all(doc.get(key) == value for key, value in query.items()):
                deleted += 1
            else:
                remaining.append(doc)
        self._store[self._name] = remaining
        return type("DeleteResult", (), {"deleted_count": deleted})()

    async def count_documents(self, query: dict[str, Any] | None = None):
        query = query or {}
        return sum(all(doc.get(key) == value for key, value in query.items()) for doc in self._documents())

    def find(self, query: dict[str, Any] | None = None):
        query = query or {}
        docs = [doc for doc in self._documents() if all(doc.get(key) == value for key, value in query.items())]
        return InMemoryCursor(docs)


class InMemoryDatabase:
    def __init__(self, name: str, store: dict[str, list[dict]]):
        self.name = name
        self._store = store

    def __getitem__(self, name: str):
        return AsyncInMemoryCollection(self._store, name)

    def __getattr__(self, name: str):
        return self[name]


class InMemoryAsyncDatabase:
    def __init__(self):
        self._store: dict[str, list[dict]] = defaultdict(list)

    def __getitem__(self, name: str):
        return InMemoryDatabase(name, self._store)

    def __getattr__(self, name: str):
        return self[name]


def get_database_client() -> Any:
    global _default_client
    settings = get_settings()

    if os.environ.get("PYTEST_CURRENT_TEST") or settings.environment.lower() in {"test", "testing"}:
        if _default_client is None or not hasattr(_default_client, "_store"):
            logger.info("Using in-memory fallback database for test environment.")
            _default_client = InMemoryAsyncDatabase()
        return _default_client

    try:
        if _default_client is None or not hasattr(_default_client, "_store"):
            _default_client = AsyncIOMotorClient(settings.mongo_uri, serverSelectionTimeoutMS=2000)
            _default_client.admin.command("ping")
        return _default_client
    except Exception:
        logger.warning("MongoDB unreachable; using in-memory fallback database.")
        _default_client = InMemoryAsyncDatabase()
        return _default_client


def get_db() -> Any:
    client = get_database_client()
    settings = get_settings()
    if hasattr(client, "_store"):
        return InMemoryDatabase(settings.mongo_db_name, client._store)
    return client[settings.mongo_db_name]

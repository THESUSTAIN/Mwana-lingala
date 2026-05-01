"""Modular routers for Mwana Lingala backend.

Routers extracted from the monolithic server.py. Each router is a thin FastAPI
APIRouter that depends on shared state (db, auth dependencies) passed through
`init(ctx)` from server.py at startup.

Keeping this pattern avoids circular imports between server.py and domain modules.
"""

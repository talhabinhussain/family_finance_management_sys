import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.routers import accounts, categories, members, reports, setup, transactions


app = FastAPI(title="Family Finance Management System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(members.router)
app.include_router(accounts.router)
app.include_router(categories.router)
app.include_router(setup.router)
app.include_router(transactions.router)
app.include_router(reports.router)


@app.get("/health")
def get_health():
    return {"status": "Server is Running"}



# test_db.py
import os; from dotenv import load_dotenv
from sqlmodel import create_engine, text
load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"), pool_pre_ping=True)
with engine.connect() as c: print(c.execute(text("select version()")).scalar())

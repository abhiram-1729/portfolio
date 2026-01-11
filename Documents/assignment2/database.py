import os
import asyncio
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv
import logging

load_dotenv()

# Service role is safer for backend, but anon works for now
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    logging.warning("Supabase URL or Key not found in environment variables.")

supabase: Client = create_client(url, key) if url and key else None

async def create_session(user_id: str = "guest") -> str:
    """Stick a new session in the DB and give us the ID"""
    if not supabase:
        return "mock-session-id"
    
    data = {
        "user_id": user_id,
        "start_time": datetime.utcnow().isoformat()
    }
    try:
        # Using to_thread because the supabase-py client is synchronous
        res = await asyncio.to_thread(lambda: supabase.table("sessions").insert(data).execute())
        return res.data[0]['session_id']
    except Exception as e:
        logging.error(f"Error creating session: {e}")
        return "error-session-id"

async def log_event(session_id: str, event_type: str, content: str, metadata: dict = None):
    """Save an event log to the history table"""
    if not supabase:
        return
    
    data = {
        "session_id": session_id,
        "event_type": event_type,
        "content": content,
        "metadata": metadata or {},
        "timestamp": datetime.utcnow().isoformat()
    }
    try:
        await asyncio.to_thread(lambda: supabase.table("event_logs").insert(data).execute())
    except Exception as e:
        logging.error(f"Error logging event: {e}")

async def update_session_summary(session_id: str, summary: str, duration: int, end_time: datetime = None):
    """Wrap up the session record with the summary and end time"""
    if not supabase:
        return

    data = {
        "end_time": (end_time or datetime.utcnow()).isoformat(),
        "summary": summary,
        "duration_seconds": duration
    }
    try:
        await asyncio.to_thread(lambda: supabase.table("sessions").update(data).eq("session_id", session_id).execute())
    except Exception as e:
        logging.error(f"Error updating session: {e}")

async def get_session_history_for_summary(session_id: str):
    """Grab everything that was said to build the summary"""
    if not supabase:
        return []
    
    try:
        res = await asyncio.to_thread(lambda: supabase.table("event_logs").select("*").eq("session_id", session_id).order("timestamp").execute())
        return res.data
    except Exception as e:
        logging.error(f"Error fetching history: {e}")
        return []

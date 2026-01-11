import asyncio
from typing import Dict
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from database import create_session, log_event, update_session_summary, get_session_history_for_summary
from llm_service import stream_response, generate_summary

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Keeping track of active websocket connections here
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]

manager = ConnectionManager()

# This runs in the background after a session ends to wrap things up
async def process_session_end(session_id: str, start_time: datetime):
    end_time = datetime.utcnow()
    duration = (end_time - start_time).total_seconds()
    
    # Grab the conversation history from the DB
    logs = await get_session_history_for_summary(session_id)
    
    # Turn the logs into a format the AI can actually read
    history_text = ""
    for log in logs:
        role = log.get("event_type", "unknown")
        content = log.get("content", "")
        if role in ["user", "ai"]:
             history_text += f"{role.upper()}: {content}\n"
    
    if not history_text:
        history_text = "No interaction recorded."

    # Ask the AI to write a quick summary of what happened
    summary = await generate_summary(history_text)
    
    # Save everything back to Supabase
    await update_session_summary(session_id, summary, int(duration), end_time)
    print(f"Session {session_id} processed. Summary: {summary}")

@app.websocket("/ws/session/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str, background_tasks: BackgroundTasks):
    await manager.connect(websocket, session_id)
    
    # Make sure we actually have a session record in the database
    # Ideally, we might want to CREATE the session here if it's new. 
    # Let's assume the client asks for a session, and we create it if it doesn't exist? 
    # Or cleaner: We just treat the passed ID as the ID we want to use.
    # For robustness, let's just ensure we have 'started' it in our DB.
    
    # BUT `create_session` generates a NEW ID. 
    # So actually, maybe the client should hit a proper HTTP endpoint to 'start' a session first?
    # Or, simpler for this assignment: The client connects with a random ID, we accept it.
    # Actually, let's use the `create_session` logic:
    # If the client passes "new", we generate one and tell them? 
    # WebSocket handshake doesn't easily return data except via messages.
    
    # How we handle new sessions:
    # 1. Client connects to `/ws/session/new` -> We generate ID, send it as first message, then proceed.
    # 2. OR Client generates UUID. 
    # Let's go with: Client generates UUID or we accept what they send. 
    
    # Let's track when this session kicked off
    # Note: `create_session` in `database.py` inserts a NEW row. 
    # We might want to adjust `database.py` to allow passing an ID, or just ignore for now and assume `create_session` returns a DB-generated ID.
    
    # Just create a new DB record and link it to this connection
    db_session_id = await create_session(user_id="anonymous_user")
    
    # Let the user know they're connected
    # Let's just send a system message "Connected, Session ID: ..."
    await websocket.send_text(f"System: Connected. Session ID: {db_session_id}")
    
    start_time = datetime.utcnow()
    
    # Store the chat history so the AI has some context
    # We will keep it in memory for the duration of the WS connection.
    conversation_history = [
        {"role": "system", "content": "You are a helpful AI assistant. You have access to tools."}
    ]

    try:
        while True:
            data = await websocket.receive_text()
            
            # Save what the user said
            await log_event(db_session_id, "user", data)
            
            # Add user's message to the context
            conversation_history.append({"role": "user", "content": data})
            
            # Start streaming back the AI's reply
            ai_response_content = ""
            async for token in stream_response(conversation_history):
                await websocket.send_text(token)
                ai_response_content += token
            
            # Save the full AI response once it's done
            await log_event(db_session_id, "ai", ai_response_content)
            
            # Update history with the new response
            conversation_history.append({"role": "assistant", "content": ai_response_content})
            
    except WebSocketDisconnect:
        manager.disconnect(session_id)
        # Kick off the wrap-up task
        # Note: can't use `background_tasks` directly in WS endpoint easily after it returns?
        # Actually, in FastAPI WS, the function exits when disconnect happens.
        # We can just await the processing function OR fire-and-forget using `asyncio.create_task`.
        # `asyncio.create_task` is better to not block the socket close (though it is closed already).
        
        asyncio.create_task(process_session_end(db_session_id, start_time))
        print(f"Client disconnected - Session {db_session_id}")

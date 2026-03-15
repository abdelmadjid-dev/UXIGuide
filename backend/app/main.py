import asyncio
import base64
import json
import logging
import warnings
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from google.adk import Runner
from google.adk.agents import RunConfig, LiveRequestQueue
from google.adk.agents.run_config import StreamingMode
from google.adk.sessions import InMemorySessionService
from google.genai import types
from starlette.responses import FileResponse
from starlette.staticfiles import StaticFiles

import firebase_admin
from firebase_admin import firestore
from google.cloud.firestore_v1.base_query import FieldFilter

from app.agent import agent

# Configure logging
logger = logging.getLogger(__name__)

# Suppress Pydantic serialization warnings
warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")

# Load environment variables from .env file BEFORE importing agent
load_dotenv(Path(__file__).parent / ".env")

# Application name constant
APP_NAME = "uxiguide-agent"

# ========================================
# Application Initialization (once at startup)
# ========================================

# Initialize Firebase Admin SDK
try:
    firebase_app = firebase_admin.get_app()
except ValueError:
    firebase_app = firebase_admin.initialize_app()
db = firestore.client()

app = FastAPI()

# Mount static files, TODO: this is used for testing, to be removed on production
static_dir = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Define your session service
session_service = InMemorySessionService()

# Define your runner
runner = Runner(app_name=APP_NAME, agent=agent, session_service=session_service)

# ========================================
# HTTP Endpoints
# ========================================

@app.get("/v0.1/api/widget.js")
async def serve_widget():
    """Serve the built widget script."""
    widget_path = Path(__file__).parent.parent.parent / "script" / "dist" / "widget.js"
    if not widget_path.exists():
        # Fallback for dev if not built yet
        return {"error": "widget.js not found. Please run 'npm run build' in the /script directory."}
    return FileResponse(widget_path)

@app.get("/v0.1/api/health")
async def health_check():
    """Diagnostic endpoint to verify Firestore and Environment."""
    try:
        # Try a simple Firestore metadata fetch
        db.collection("projects").limit(1).get(timeout=2.0)
        firestore_status = "connected"
    except Exception as e:
        firestore_status = f"error: {str(e)}"

    return {
        "status": "ok",
        "version": "v0.1",
        "firestore": firestore_status,
        "app_name": APP_NAME
    }

# ========================================
# WebSocket Endpoint
# ========================================

@app.websocket("/v0.1/api/interact/{user_id}/{session_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, session_id: str, api_key: str | None = None) -> None:
    # 0. Check for API Key in query params if not found in path
    if not api_key:
        api_key = websocket.query_params.get("api_key")
        
    if not api_key:
        logger.warning(f"Rejected WS connection: Missing API Key for user {user_id}")
        await websocket.close(code=1008, reason="Missing API Key")
        return

    # 1. Extract and sanitize Origin (Case-Insensitive Host)
    origin = websocket.headers.get("origin")
    request_host = ""
    if origin:
        # Remove protocol, then split by port if present, then remove trailing slashes and lowercase
        request_host = origin.replace("https://", "").replace("http://", "").split(":")[0].rstrip("/").lower()
        
    if not request_host:
        logger.warning(f"Rejected WS connection: Missing or invalid Origin header for API Key {api_key}. Received Origin: '{origin}'")
        await websocket.close(code=1008, reason="Missing Origin header")
        return
        
    # 2. Fetch project by api_key field and validate domain
    def _get_project_data():
        logger.info(f"Querying Firestore for api_key: '{api_key}'")
        projects_ref = db.collection("projects")
        query = projects_ref.where(filter=FieldFilter("api_key", "==", api_key)).limit(1)
        results = query.get(timeout=5.0)
        if not results:
            logger.warning(f"No Firestore project found with api_key: '{api_key}'")
            return None
        return results[0].to_dict()

    try:
        project_data = await asyncio.to_thread(_get_project_data)
    except Exception as e:
        logger.error(f"Internal error authorizing API Key {api_key}: {e}")
        await websocket.close(code=1011, reason="Internal Server Error")
        return

    if not project_data:
        logger.warning(f"Rejected WS connection: API Key {api_key} not found in database")
        await websocket.close(code=1008, reason="Invalid API Key")
        return

    # 3. Validate Origin against the project's whitelisted domain
    whitelisted_input = project_data.get("whitelisted_domain", "")
    # Sanitize whitelist (remove protocol, ports, trailing slashes and lowercase)
    whitelisted_host = whitelisted_input.replace("https://", "").replace("http://", "").split(":")[0].rstrip("/").lower()
    
    logger.info(f"Handshake Logic: API Key {api_key} | Request Host: '{request_host}' | Whitelisted Host: '{whitelisted_host}'")
    
    # Check for direct match or localhost/127.0.0.1 equivalence for local development
    local_hosts = ["localhost", "127.0.0.1"]
    is_authorized = (request_host == whitelisted_host)
    
    if not is_authorized and request_host in local_hosts and whitelisted_host in local_hosts:
        is_authorized = True
        logger.info(f"Authorized local development alias: '{request_host}' allowed for whitelisted '{whitelisted_host}'")

    if not is_authorized:
        logger.warning(f"Rejected WS connection: Host mismatch. '{request_host}' != '{whitelisted_host}'")
        await websocket.close(code=1008, reason="Unauthorized Domain")
        return

    logger.info(f"Authorized connection for API Key {api_key} (Host: {request_host})")
    await websocket.accept()

    # Build RunConfig with optional proactivity and affective dialog
    run_config = RunConfig(
        streaming_mode=StreamingMode.BIDI,
        session_resumption=types.SessionResumptionConfig(),
        # TODO: potentially handle proactivity and affective dialog
    )

    # Get or create session (handles both new sessions and reconnections)
    session = await session_service.get_session(
        app_name=APP_NAME, user_id=user_id, session_id=session_id
    )
    if not session:
        await session_service.create_session(
            app_name=APP_NAME, user_id=user_id, session_id=session_id
        )

    live_request_queue = LiveRequestQueue()

    async def heartbeat_task(ws: WebSocket):
        try:
            while True:
                await asyncio.sleep(5)  # Send ping every 5 seconds
                await ws.send_text("ping")
        except Exception:
            # If sending fails, the socket is likely already dead
            pass

    async def upstream_task() -> None:
        """Receives messages from WebSocket and sends to LiveRequestQueue."""
        while True:
            # Receive message from WebSocket (text or binary)
            message = await websocket.receive()

            # Handle binary frames (audio data)
            if "bytes" in message:
                audio_data = message["bytes"]
                audio_blob = types.Blob(
                    mime_type="audio/pcm;rate=16000", data=audio_data
                )
                live_request_queue.send_realtime(audio_blob)

            # Handle text frames (JSON messages)
            elif "text" in message:
                text_data = message["text"]
                if text_data != "pong":
                    json_message = json.loads(text_data)

                    # Extract text from JSON and send to LiveRequestQueue
                    if json_message.get("type") == "text":
                        content = types.Content(
                            parts=[types.Part(text=json_message["text"])]
                        )
                        live_request_queue.send_content(content)

                    elif json_message.get("type") == "image":
                        image_data = base64.b64decode(json_message["data"])
                        mime_type = json_message.get("mimeType", "image/jpeg")
                        image_blob = types.Blob(mime_type=mime_type, data=image_data)
                        live_request_queue.send_realtime(image_blob)

    async def downstream_task() -> None:
        """Receives Events from run_live() and sends to WebSocket."""
        async for event in runner.run_live(
                user_id=user_id,
                session_id=session_id,
                live_request_queue=live_request_queue,
                run_config=run_config,
        ):
            event_json = event.model_dump_json(exclude_none=True, by_alias=True)
            await websocket.send_text(event_json)

    # Run both tasks concurrently
    try:
        await asyncio.gather(heartbeat_task(websocket), upstream_task(), downstream_task())
    except WebSocketDisconnect:
        logger.debug("Client disconnected normally")
    except Exception as e:
        logger.error(f"Unexpected error in streaming tasks: {e}", exc_info=True)
    finally:
        # Always close the queue, even if exceptions occurred
        live_request_queue.close()

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

@app.get("/")
async def root():
    """Serve the index.html page."""
    return FileResponse(Path(__file__).parent / "static" / "index.html")

# ========================================
# WebSocket Endpoint
# ========================================

@app.websocket("/ws/{user_id}/{session_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, session_id: str) -> None:
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

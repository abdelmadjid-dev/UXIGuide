from fastapi import FastAPI, WebSocket, WebSocketDisconnect

# ========================================
# Application Initialization (once at startup)
# ========================================

app = FastAPI()

# ========================================
# WebSocket Endpoint
# ========================================
@app.websocket("/ws/{user_id}/{session_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, session_id: str) -> None:
    await websocket.accept()
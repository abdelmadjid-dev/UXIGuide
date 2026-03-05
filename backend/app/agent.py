import os

from google.adk.agents.llm_agent import Agent
from google.adk.tools.function_tool import FunctionTool

# The System Prompt for UXIGuide
SYSTEM_INSTRUCTION = """
You are UXIGuide, a live AI co-pilot for web navigation. You see what the user sees via a proactive screenshot stream.

### DETECTION & COORDINATE PROTOCOL:
- When identifying UI elements, use the format [ymin, xmin, ymax, xmax].
- All coordinates MUST be normalized to a scale of 0-1000 based on the image dimensions.
- Detect the prominent items in the image that are relevant to the user's request.

### OPERATIONAL RULES:
1. **SYNCED GUIDANCE:** Every time you give a verbal instruction (e.g., "Click on the login button"), you MUST simultaneously call `send_navigation_coordinates` with the normalized box_2d.
2. **PROACTIVE SIGHT:** You receive screenshots automatically. Always use the most recent image to determine coordinates.
3. **FLOW CONTROL:** - Set `is_final_action=False` if the user needs to perform more steps after this click.
   - Set `is_final_action=True` only when the task is fully resolved.
4. **NO HALLUCINATION:** If an element is not visible in the current screenshot, do not guess coordinates. Instead, ask the user to scroll or navigate, then wait for the next automatic screenshot refresh.

### TONE:
Helpful, immediate, and concise. Speak to the user naturally while the system handles the highlighting.
"""


def send_navigation_coordinates(xmin: int, xmax: int, ymin: int, ymax: int, is_final_action: bool):
    """
        Highlights a specific UI element. Coordinates must be normalized to 0-1000.

        Args:
            ymin: Top edge (0-1000)
            xmin: Left edge (0-1000)
            ymax: Bottom edge (0-1000)
            xmax: Right edge (0-1000)
            is_final_action: True if this completes the user's request.
    """
    return {"status": "coordinates_sent", "bound": {"xmin": xmin, "xmax": xmax, "ymin": ymin, "ymax": ymax},
            "is_final_action": is_final_action}


agent = Agent(
    name="uxiguide_agent",
    model=os.getenv("LIVE_AGENT_MODEL", "gemini-2.5-flash-native-audio-preview-09-2025"),
    instruction=SYSTEM_INSTRUCTION,
    tools=[FunctionTool(send_navigation_coordinates)]
)

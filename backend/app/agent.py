import os

from google.adk.agents.llm_agent import Agent
from google.genai.types import GenerateContentConfig

# The System Prompt for UXIGuide
SYSTEM_INSTRUCTION = """
You are a supportive, multi-modal AI Web Assistant. You guide users step-by-step through website workflows. 
You operate strictly as a command-driven state machine. To ensure accuracy, you must adhere rigidly to the following 
rules:

1. COMMAND ADHERENCE: You will receive system directives prefixed with "COMMAND:". You must execute ONLY the instructions 
within the current command. Do not anticipate future steps or execute actions not explicitly requested in the command.
2. IF THE USER ASKS ABOUT HOW TO DO SOMETHING: 
    - **EXECUTE TOOL FIRST**: Call `request_screenshot(intent=...)` immediately, don't mention your intention execute it.
    - **THEN SPEAK**: "I need to see your screen to help with that. One moment."
    - **STOP**: Do not say anything else.
3. ZERO HALLUCINATION: You are blind until a screenshot is provided. Never guess UI layouts, buttons, or workflows. All 
instructions must be strictly grounded in the provided screenshot and the DOM Mapping JSON. 
4. ONE STEP AT A TIME: When guiding a user, only speak about the single, immediate next step. Never read out a full list 
of instructions.
5. TOOL USAGE: When commanded to call a tool (`dispatch_next_action`, `request_screenshot`), execute it exactly once per 
command, simultaneously with your verbal response.
6. INTERRUPTION HANDLING:
    - If the user interrupts with a NEW goal: Immediately ABANDON the current action sequence and call 
    `request_screenshot(intent=...)` for the new goal.
    - If the user interrupts with a QUESTION about the current step: Answer the question briefly using the provided DOM 
    context, then RE-STATE the current step. Do not call a tool again unless they ask "What's next?".
    - If the user says "Wait" or "Stop": Cease all speech and wait for the next COMMAND or user input.
    - NO STALE DATA: If the user indicates they have navigated to a different page manually during an interruption, your 
    current DOM map is STALE. Call `request_screenshot` immediately to re-sync.
"""


def request_screenshot(intent: str) -> dict:
    """
    Triggers the frontend to capture a full-page screenshot and extract the DOM element mapping.
    Use this immediately after the user states their goal, or when the page changes and you need to see the new state.

    Args:
        intent: The user's stated goal or what they are trying to achieve (e.g., "log into the page", "change profile picture").
    """
    return {
        "status": "screenshot_requested",
        "intent": intent
    }


def dispatch_next_action(id: str, x: int, y: int, w: int, h: int, is_final_action: bool) -> dict:
    """
    Sends the single next action that the user has to do based on the provided screenshot and DOM map.

    Args:
        id: The ID of the element from the DOM mapping. Use "none" if no ID is available.
        x: The horizontal left coordinate of the element (normalized 0-1000).
        y: The vertical top coordinate of the element (normalized 0-1000).
        w: The width of the element.
        h: The height of the element.
        is_final_action: True if this specific action completes the user's current intent. False if more actions are needed on this screen, or if clicking this will change the page and require a new screenshot.
    """
    print("calling dispatch_next_action")
    return {
        "status": "action_dispatched",
        "id": id,
        "rect": {"x": x, "y": y, "w": w, "h": h},
        "is_final_action": is_final_action
    }


agent = Agent(
    name="uxiguide_agent",
    model=os.getenv("LIVE_AGENT_MODEL", "gemini-2.5-flash-native-audio-preview-12-2025"),
    instruction=SYSTEM_INSTRUCTION,
    generate_content_config=GenerateContentConfig(
        temperature=0,
        top_p=0.3,
        top_k=10,
    ),
    tools=[request_screenshot, dispatch_next_action]
)

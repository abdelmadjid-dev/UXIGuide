import os

from google.adk.agents.llm_agent import Agent

# The System Prompt for UXIGuide
SYSTEM_INSTRUCTION = """
You are a supportive, multi-modal AI Web Assistant. You help users use the website properly, you give me instructions 
step by step how to do anything within the website and answer their questions about the website.

- [WHEN USER WRITES "COMMAND::Hi"]: Introduce yourself and ask how can you help the user.
- [WHEN USER ASKS ABOUT HOW TO DO SOMETHING THE WEBSITE]: ALWAYS IMMEDIATELY call the tool `request_screenshot` THEN 
tell the user that you WILL take screenshot THEN STOP TALKING.
- [WHEN USER WRITES "COMMAND::image_sent"]: Analyze it with the dom map then
    - If the request can't be done in this screen for example asking to order coffee in login page. EXPLAIN to the user 
    that you can't help and why
    - If the request is doable then Immediately call the tool `dispatch_next_action`. The action MUST be simple and 
    MUST ONLY describe the next step.
- [WHEN THE USER TYPES "COMMAND::next" OR EXPLICITLY ASKS FOR THE NEXT STEP]: Call the tool `dispatch_next_tool` again 
with the next action. DO NOT SKIP actions and WAIT for user's request.
- Repeat the process until the user achieves his goal.
- [ONCE THE USER SAYS "COMMAND::next" ON THE LAST ACTION]: Inform the user that he should have achieved his request.

RULES
    - After calling the tool `dispatch_next_tool`, always explain to the user the action.
    - DON'T say the same thing twice.
    - If the action is to fill an input, DO NOT tell the user to click on the input, instead tell him to fill it
    - If the action is to fill an input, DO NOT tell the user what to type.
"""


def request_screenshot():
    """
    Triggers the frontend to capture a full-page screenshot and
    extract the DOM element mapping. Use this whenever you need
    to see the current state of the page.
    """
    return {"status": "sent"}


def show_error(message: str):
    """
    Displays an error message to the user when a task is impossible
    on the current page or if the user's request is ambiguous.

    Args:
        message: A clear explanation of why the action cannot be completed.
    """
    return {message: message}


def dispatch_next_action(id: str, xmin: int, xmax: int, ymin: int, ymax: int, is_final_action: bool):
    """
    Sends the next that the user has to do

    Args:
        id: id of the element
        ymin: Top edge (0-1000)
        xmin: Left edge (0-1000)
        ymax: Bottom edge (0-1000)
        xmax: Right edge (0-1000)
        is_final_action: True if this completes the user's request.
    """
    return {"status": "coordinates_sent", "id": id, "bound": {"xmin": xmin, "xmax": xmax, "ymin": ymin, "ymax": ymax},
            "is_final_action": is_final_action}


agent = Agent(
    name="uxiguide_agent",
    model=os.getenv("LIVE_AGENT_MODEL", "gemini-2.5-flash-native-audio-preview-09-2025"),
    instruction=SYSTEM_INSTRUCTION,
    tools=[request_screenshot, dispatch_next_action]
)

import os

from google.adk.agents.llm_agent import Agent

# The System Prompt for UXIGuide
SYSTEM_INSTRUCTION = """
You are UXIGuide, a supportive, multi-modal AI Web Assistant.

- [WHEN USER SAYS "Hi"]: Introduce yourself and ask how can you help the user.
- [WHEN USER ASKS EXPLICITLY ABOUT SOMETHING TO DO ON THE WEBSITE]: Immediately call the tool `request_screenshot`. DO 
NOT answer the user until the image and additional context is received.
- [WHEN IMAGE IS RECEIVED]: Analyze the screenshot then Immediately call the tool `dispatch_next_action`. The action 
should be simple and describes only the next step.
- [WHEN THE USER SAYS "Done, What's next"]: Call the tool `dispatch_next_tool` again with the following action.
- Repeat the process until the user achieves his goal.
- [ONCE THE USER SAYS "Done, What's next" ON THE LAST ACTION]: Inform the user that he should have achieved his request.

RULES
    - After calling the tool `dispatch_next_tool`, always explain to the user the action.
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

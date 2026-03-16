import os

from google.adk.agents.llm_agent import Agent, LlmAgent
from google.genai.types import GenerateContentConfig


# The System Prompt for UXIGuide
def get_system_instruction(tone: str, speed: str, formality: str) -> str:
    configs = {
        "Tone": tone,
        "Speed": speed,
        "Formality": formality
    }
    style_lines = [f"- {key}: {value}" for key, value in configs.items() if value]
    style_block = "\n".join(style_lines)

    return f"""
    You operate strictly as a command-driven state machine. To ensure accuracy, adhere rigidly to these core rules:

    # CORE RULES
        1. ZERO HALLUCINATION: You are blind until a screenshot and DOM map are provided. Do not guess. All actions must 
        be grounded in the coordinates and labels of the provided JSON.
        2. ATOMIC ACTIONS & MANDATORY DISPATCH: Identify the SINGLE next step (or group of choices) and IMMEDIATELY call 
        'dispatch_next_action'. You are forbidden from giving verbal advice without also triggering the tool to highlight 
        the UI elements you are discussing. Focus only on the immediate next interaction.
        3. MULTI-MODAL GROUNDING: Rely primarily on the DOM mapping JSON for interactivity. If an element lacks a clear 
        'label' or 'purpose', use its 'coordinates' (xmin, xmax, ymin, ymax) to locate it in the screenshot and deduce 
        its function visually (e.g., recognizing a gear icon as 'Settings').
        4. THE "NO ID" FALLBACK: You dispatch actions using the element's 'id'. If the target element has NO 'id' in the 
        DOM map, you CANNOT dispatch an action. Instead, provide clear, concise verbal instructions using visual landmarks 
        so the user can click it manually.
        5. VOICE-OPTIMIZED OUTPUT: You are speaking to the user via a live voice model. Your spoken responses must be 
        natural, warm, and concise (1-2 sentences). Do not use Markdown, bullet points, or read code/JSON out loud.
        6. GROUP INTERACTION RULE
            - LINEAR FLOW: If there is only one logical next step, pass a single ID to 'dispatch_next_action'.
            - CHOICE FLOW: If the user must choose between multiple related items (e.g., "Select a shipping method" or 
            "Choose a category"), pass ALL relevant IDs in that group to 'dispatch_next_action'.
            - VERBAL GUIDANCE: When dispatching multiple IDs, your spoken instruction must be plural or categorical 
            (e.g., "Please select one of the subscription plans below" rather than naming every single plan).

    # INTERRUPTION & PAUSE HANDLING
        - PAUSES ("Wait", "Hold on", "Umm"): Warmly acknowledge the pause (e.g., "Take your time.") and do not dispatch 
        new actions. Wait for the user.
        - NEW GOALS: If the user states a completely new goal, immediately abandon the current sequence and begin analyzing 
        the UI for the new goal.
        - CLARIFICATIONS: If the user asks a question about the screen, answer briefly using the screenshot/DOM context, 
        then gently restate the current step.
        - STALE DATA: If the user navigates away manually, wait for the COMMAND: UPDATE_VISUAL_MEMORY before issuing new 
        instructions.
    
    # VOICE & PERSONALITY
    {style_block if style_block else "- Default: Be a helpful, balanced, and professional assistant."}
"""


def dispatch_next_action(ids: list[str]) -> dict:
    """
    Dispatches the next set of valid interactive elements to the user.

    Args:
        ids: A list of element IDs from the DOM mapping.
             - Use a single ID for linear steps (e.g., a "Next" button).
             - Use multiple IDs for choice-based steps (e.g., selecting a radio button,
               picking one of multiple 'Plan' buttons, or a button group).
    """
    return {
        "status": "actions_dispatched",
        "ids": ids
    }


def get_agent(tone: str, speed: str, formality: str) -> LlmAgent:
    return Agent(
        name="uxiguide_agent",
        model=os.getenv("LIVE_AGENT_MODEL", "gemini-2.5-flash-native-audio-preview-12-2025"),
        instruction=get_system_instruction(tone, speed, formality),
        generate_content_config=GenerateContentConfig(
            temperature=0,
            top_p=0.3,
            top_k=10,
        ),
        tools=[dispatch_next_action]
    )

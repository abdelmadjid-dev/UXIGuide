import os

from google.adk.agents import Agent

agent = Agent(
    name="uxiguide_agent",
    model=os.getenv(
        "LIVE_AGENT_MODEL", "gemini-2.5-flash-native-audio-preview-12-2025"
    ),
    instruction="You are a helpful assistant that answer questions",
)
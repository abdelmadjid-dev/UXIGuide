import os

from google.adk.agents import Agent

agent = Agent(
    name="uxiguide_agent",
    model=os.getenv(
        "LIVE_AGENT_MODEL", "gemini-2.5-flash-native-audio-preview-12-2025"
    ),
    instruction="""You are a UX guide. The user will ask you how to do something in the website, send this command "COMMAND - SCREENSHOT" via text
     to the website which will take a screenshot and send it to you to analyze. When you receive the image analyze it and return in text the 
     coordinates where to click and tell the user what to do (COMMAND - COORDINATES [xmin, xmax, ymin, ymax]).
     Make sure to respond everytime and keep the user updated of what you are doing especially when analyzing the image.
     """,
)

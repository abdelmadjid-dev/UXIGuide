# Project Structure Definition

> NOTE: this structure is initial and should change later, it is initiated just to have a ground to work on and get going

- `Poetry` was used for dependency management and packaging
- as of now, only the necessary dependencies were added: `fastapi` and `asyncio` for the Live API based on an initial look into ADK documentations and of course `google-adk`
- using Dispatchit project as inspiration, the project is structured as such:
    - `agent.py` serves as orchestrator agent using subagents within `/subagents`
    - `api.py` will be used to communicate with Firestore to pull necessary data & configs
    - `errors.py` and `types.py` are common parts
    - `main.py` is technically the entry point defining the `WebSocket` for Live API
        - there might be some confusion between `main.py` and `agent.py` but it will be clear later: Most likely `agent.py` will either define both thinking/live agents or define one using subagents (thinking will be considered as a subagent)
    - subagents as of now are just placeholders
# Project Structure Definition

> NOTE: this structure is initial and should change later, it is initiated just to have a ground to work on and get
> going

- `Poetry` was used for dependency management and packaging
- the new project structure (was changed, inspired by bidi-demo) is:
    - within `/app`
        - `main.py` is technically the entry point defining the `WebSocket` for Live API
        - `agent.py` serves as orchestrator agent using subagents/tools within `/subagents`
        - `common/` will have other potential needed files
            - `api.py` will be used to communicate with Firestore to pull necessary data & configs
            - `errors.py` and `types.py` are common parts
        - subagents as of now are just placeholders

# Process Followup

- [x] make Live API run locally, a local `index.html` is used to communicate with the backend
    - NOTE: to run locally for tests, use: `poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- [ ] add subagents/tools to analyze images and define next actions & link them to orchestrator agent
- [ ] communicate with orchestrator and its tools/subagents
    - receive request to get screenshot
    - send screenshot to be analyzed
    - receive highlights
    - all while talking to user realtime
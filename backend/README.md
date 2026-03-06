# Project Structure Definition

> NOTE: this structure is changing after each sprint of work in case of any changes.

- `Poetry` was used for dependency management and packaging
- the new project structure (was changed, inspired by bidi-demo) is:
    - within `/app`
        - `main.py` is technically the entry point defining the `WebSocket` for Live API
        - `agent.py` the live agent with `tools` and `SYSTEM_INSTRUCTION` (to be cleaned)
        - `common/` will have other potentially needed files
            - `api.py` will be used to communicate with Firestore to pull necessary data & configs
            - `errors.py` and `types.py` are common parts
    - project is packaged with a demo `index.html` providing a mock-script that interacts with the agent. Once this
      mock-script is complete, the components are to be moved into the actual script.
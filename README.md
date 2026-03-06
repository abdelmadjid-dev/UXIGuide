### CRITERIA TO LOOK FOR:

- We should target **Live Agents**, it fits better our use-case even though a UI Navigator is also an option. Live
  Agents are agents that can talk naturally and be interrupted. One of the examples is a `customer support voice agent`.
    - A **UI Navigator** is an agent that can become the user's hands on screen, it observes the browser and interprets
      visual elements w/ or w/out relying on APIs or DOM access. It can also perform actions based on user intent (could
      be a web navigator, a cross-app workflow automator...)
- Technical Necessities:
    - Must use `Gemini Live API` or `ADK`
    - Agents should be hosted on `Google Cloud`
    - Use at least one `Google Cloud service`
- Judging Criteria (out of 6 points)
    - Innovation and Multimodal User Experience (40% - 2.4p)
        - [ ] Does the project break the "text box" paradigm? (0.4)
            - Yes, project is mainly interactive with Live Agent sees and hears and interacts with the user
            - Project still uses text box as a fallback in case the user is uncomfortable
        - [ ] Does the agent help "See, Hear, and Speak" in a way that feels seamless? (0.4)
            - Yes, with the usage of function calling and silent messages, the user doesn't know what is going on under
              the hood (still notified but not via voice) making the process feels seamless
        - [ ] Does it have a distinct persona/voice? (0.4)
            - Yes, Developer can change/set voice and style based on the website (for example, a banking system would
              prefer a more reserved and professional persona opposite to an online games website)
        - [ ] Does the agent handle interruptions (barge-in) naturally? (0.4) - Yes
        - [ ] Is the experience "Live" and context-aware, or does it feel disjointed and turn-based? (0.4) - ?
    - Technical Implementation & Agent Architecture (30% - 1.8p)
        - [ ] Does the code effectively utilize the Google GenAI SDK or ADK? (0.3) - Yes
        - [ ] Is the backend robustly hosted on Google Cloud? (Cloud Run, Firestore) (0.3) - ?
        - [ ] Is the agent logic sound? (0.3) - ?
        - [ ] Does it handle errors gracefully? (0.3) - ?
        - [ ] Does the agent avoid hallucinations? (0.3)
            - Some systems are in place like: not proceeding if not well understanding what to do, usage of
              grounding/RAG...
        - [ ] Is there evidence of grounding? (0.3) - Yes, via RAG
    - Demo and Presentation (30% - 1.8p)
        - [ ] Does the video define the problem and solution? (0.45)
        - [ ] Is the architecture diagram clear? (0.45)
        - [ ] Is there visual proof of Cloud deployment? (0.45)
        - [ ] Does the video show the actual software working? (0.45)

# Overall Idea Definition

UXIGuide (User Experience Interactive Guide) is an interactive AI-powered boarding assistant to any website via a simple
code script. Instead of a standard text-based chatbot, UXIGuide uses voice and vision to guide users through the
interface in real-time. Here's how it works in simple terms:

- A developer adds a `<script>` tag to their website and uploads some documentations to ground the live agent
- When a user is confused, they activate UXIGuide. They can speak naturally asking questions like, "Where do I find my
  billing history?"
- UXIGuide takes a privacy aware screenshot of the user's current view and uses a reasoning model to see the buttons and
  menus on the page.
- UXIGuide talks back to the user to explain the steps while simultaneously drawing visual highlights (like glowing
  borders or arrows) directly on the website's UI elements.

## Actors Definitions

- `D: DEVELOPER`: the website owner
- `W: WEBSITE`: The website, basically referring to source code (HTML, CSS and JS)
- `U: USER`: the user of the website
- `DSH: DASHBOARD`: the Dashboard of UXIGuide where `DEVELOPER` can set up and configure UXGuide
- `A: AGENT`: the live agent, based on ADK, hosted in Google Cloud
- `S: SCRIPT`: the piece of code linking between `WEBSITE` and `AGENT`

## The Process (Setup to Finish)

### `DEVELOPER` setting up process on `DASHBOARD`

- `DEVELOPER` enters **Landing Page**, clicks on **Create Account**
- `DEVELOPER` goes to Register/Login page where he can use Email/Password or Direct Google Authentication
- `DEVELOPER` logs into their `DASHBOARD`
    - **Home Page**: Analytics (NOT TO IMPLEMENT NOW)
        - How many times the agent was used, filtered by date
        - What are the most ambiguous elements (components/tasks people usually struggle with)
        - ...
    - **Projects Page**: Accessible via Sidebar
        - displays a list of Projects, clickable to access, with menu for more tools: delete, shutdown...etc.
        - a button to add new project
        - when a project clicked, it goes into **Project Setup Page**
    - **Project Setup Page**: based on tabs, each tab represents a step of the process
        - Setup: project has a name, list of whitelisted domain names, color for floating button... (+ any other
          potential required configuration like voice used)
        - Knowledge Base: a list of articles on left side with a `WYSIWYG Editor` on the right side where `DEVELOPER`
          can add documentations for their website (+ developer can also upload, for later maybe)
        - Integration: Steps on how to integrate UXIGuide in `WEBSITE` of `DEVELOPER` - `SCRIPT` copy/paste code,
          explanation on how to redact specific elements (basically just tag them via with a className e.g.
          `.redact-uxiguide`)
    - **Account Page**: where user can update password, delete account, disconnect from Google...etc.
    - Other pages and elements on the Sidebar like Billing to be discussed once first version is live

- Some Notes about `DASHBOARD`:
    - Vibe Coding is used to deliver dashboard quickly especially UI wise, a cleanup process can be followed to make
      sure the `DASHBOARD` is secure
    - Project is based on `Firebase` benefiting from the usage of a `Google Cloud Service` and making things easier:
        - Firebase Authentication
        - Firestore for both `DEVELOPER`/`WEBSITE` details and a `vector database` for Knowledge base

### `USER` navigating on `WEBSITE` having an issue

- `SCRIPT` is a floating button on the right-bottom side of the website, disappears when user scrolls all the way down
  so it won't cover the content.
    - on a side note: `SCRIPT` styling especially floating button color (and others) exists on the copied `SCRIPT`
      source code that is added to the website source code
- when `WEBSITE` is accessed, `SCRIPT` shows a little popup saying: "If you struggle with anything, click me!"
- when `USER` struggles with something, he can click on the `SCRIPT` floating button
- a dialog is shown (only first time), requesting consent of `USER` specifying: the need for audio communication, the
  need to take screenshots while explaining that those screenshots will be redacted of any user info
- if `USER` accepts, a permission to catch audio is triggered and once it's granted, the process starts
- if process fails on any step (consent refused, permission refused), a snackbar shown (center-bottom) with the error
- if process starts:
    - floating button is now a close button, cutting the discussion if `USER` wants to
    - animations on the borders of screen aurora style (easy to make, already have code for it)
    - any silent action (like taking a screenshot) shows a popup on the center-bottom, e.g. "Taking a Screenshot..."

### `SCRIPT` communication with `AGENT`

- when process starts, `SCRIPT` initiates a **Websocket** connection with `AGENT`, while setup:
    - `SCRIPT` sends (while connecting, via ORIGIN) the domain name
    - `AGENT` search on db, projects based on whitelisted domain names, pulls either configurations or return `401`
        - (for later), if `DEVELOPER`'s hasn't paid, `AGENT` returns error
        - if allowed, based on configurations prepare the Live API (setup voice, Firestore collection path needed for
          grounding)
- `USER` asks a question or requests help, `AGENT` follows this process to guarantee it provides the proper answer
    - `AGENT` checks documentations if there's any help on how to do such a thing (automatic, via RAG?)
    - `AGENT` if figures out it need visual aid to properly help would request a screenshot from the `WEBSITE`
        - request is passed as an empty Tool Call, caught by `SCRIPT` and performed
        - while taking/sending the screenshot, `SCRIPT` should show a popup
        - screenshot should be redacted of any input text or elements flagged as private
        - [IMPORTANT, to fix], screenshot should be taken of the whole page, not only the visible part (doable)
        - `SCRIPT` sends as well a map of DOM tree (only visible items, just id/selector and recognizable elements like
          text within, background color, type)
    - `AGENT` analyzes the screenshot while aware of the tree map, decides what is the next action the user has to do:
        - if the `AGENT` recognizes the element with an id/selector, it should prefer sending the id/selector
        - if not, it sends bounding coordinates where the user should act
        - the `AGENT` also sends a boolean whether the action is final or is there other expected actions, if it's false
          `SCRIPT` should wait for the action and sends back another screenshot when done.
            - this boolean is relevant only if next state is a different page or UI changes drastically
        - `AGENT` should send a list of actions (id/selector of element or bounding coordinates, type of action) in case
          all the actions are to be done in the same screen (for example filling a form, or clicking on different
          buttons)
            - `SCRIPT` handles actions one by one, checks first one, highlights while `AGENT` explains what to do
            - `SCRIPT` listens to user's action, when done sends a silent message to `AGENT`
            - `AGENT` shouldn't relay all the steps at once, only first step is explained, when it receives the silent
              message, it explains the next one
            - process repeats until the whole list of actions are finished
    - `AGENT`, when done, gracefully stops after logging the process (NOT TO BE IMPLEMENTED, UNTIL EVERYTHING IS DONE)
        - increments usage count with a timestamp (for usage analytics), maybe additional details like: browser type,
          device...etc.
        - what did the user struggle with, in a specific format that could be used on Analytics to know what's ambiguous
        - others...

### Additional Considerations

- `AGENT` should keep in touch with the `USER` while doing actions (like taking screenshot, analyzing screenshots...)
- `AGENT` shouldn't act if it can't figure out what to do (in some websites. Developer might have made a mistake like
  naming a button in a weird way (like instead of Account, developer might put Headquarters) and not mention it in the
  documentations) - instead, it should tell the `USER` that
- `AGENT` should handle interruptions, either pause the analysis process or start over in case `USER` wanted help in a
  different matter
- Errors can be displayed either via snackbar (serious errors cutting the process) or via `AGENT` explains and tries to
  fix it (process errors, like not understanding something, no visual aid...etc.)
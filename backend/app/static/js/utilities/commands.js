const INITIALIZE_SESSION = "COMMAND: INITIALIZE_SESSION"

const ANALYZE_CONTEXT = (intent, map) => `COMMAND: ANALYZE_CONTEXT
Context: You have received the visual screenshot and the following DOM Mapping: ${map}
User's Goal: ${intent}
`
const STEP_COMPLETED = "COMMAND: STEP_COMPLETED - Context: The user has successfully completed the previous action."
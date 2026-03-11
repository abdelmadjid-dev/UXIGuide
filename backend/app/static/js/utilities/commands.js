const INITIALIZE_SESSION = `COMMAND: INITIALIZE_SESSION
Instructions: 
1. Briefly introduce yourself as the web assistant.
2. Ask the user what they would like to do or need help with on this website.
3. Stop and wait for their response. Keep your spoken output brief and friendly.
`

const ANALYZE_CONTEXT = (intent, map) => `COMMAND: ANALYZE_CONTEXT
Context: You have received the visual screenshot and the following DOM Mapping: ${map}
User's Goal: ${intent}
Instructions: Analyze the user's goal against the screenshot and the DOM Mapping.

    Branch A [IF DIRECTLY DOABLE]:
        - Determine the required actions.
        - Call the tool \`dispatch_next_action\` ONLY ONCE with the details for the FIRST required action.
        - Verbally explain to the user exactly what to do for this first step.

    Branch B [IF DIRECTLY UNDOABLE BUT ALTERNATIVES EXIST]:
        - DO NOT just say it's undoable. 
        - IMMEDIATELY call the tool \`dispatch_next_action\` for that alternative help option.

    Branch C [IF NO ALTERNATIVES]:
        - Verbally explain to the user why the action cannot be completed here.
`

const STEP_COMPLETED = `COMMAND: STEP_COMPLETED
Context: The user has successfully completed the previous action.
Instructions: Evaluate the remaining steps to achieve the user's goal based on your previous analysis.

    Branch A [IF THAT WAS THE VERY LAST ACTION]: 
        - Verbally tell the user that the process is complete and they should have achieved their goal. Ask if they need 
        anything else.

    Branch B [IF MORE ACTIONS ARE NEEDED ON THIS SAME SCREEN]:
        - Call the tool \`dispatch_next_action\` ONCE AGAIN with the payload for the NEXT sequential action.
        - Verbally explain this single next step to the user.

    Branch C [IF THE PAGE CONTEXT WILL CHANGE / HAS CHANGED]:
        - Call the tool \`request_screenshot\`.
        - Verbally tell the user: "Great. The page needs to update, let me grab a new look at the screen."
`
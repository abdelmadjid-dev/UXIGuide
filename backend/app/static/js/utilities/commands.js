export const INITIALIZE_SESSION = `COMMAND: INITIALIZE_SESSION
Instructions: 
1. Briefly introduce yourself as the web assistant.
2. Ask the user what they would like to do or need help with on this website.
3. Stop and wait for their response. Keep your spoken output brief and friendly.
`

export const UPDATE_VISUAL_MEMORY = (map) => `COMMAND: UPDATE_VISUAL_MEMORY
Context: A major UI update has occurred. 
New DOM Mapping: ${map}
Instructions: 
1. Silently update your internal memory with this new visual context. 
2. Automatically run your Action Evaluation rules against this new context to determine the next move.
3. CRITICAL OUTPUT RULE: DO NOT acknowledge receiving this update, DO NOT say "I see the new screen", and DO NOT narrate 
your thought process. Just give the next instruction naturally.
`

export const STEP_COMPLETED = `COMMAND: STEP_COMPLETED
Context: The user has successfully completed the previous action.
Instructions: Evaluate the remaining steps to achieve the user's goal based on your previous analysis.

    Branch A [IF THAT WAS THE VERY LAST ACTION]: 
        - Verbally tell the user that the process is complete and they should have achieved their goal. Ask if they need 
        anything else.

    Branch B [IF MORE ACTIONS ARE NEEDED ON THIS SAME SCREEN]:
        - Call the tool \`dispatch_next_action\` ONCE AGAIN with the payload for the NEXT sequential action.
        - Speak ONE single sentence explaining this next step. Do not repeat the instruction.
`
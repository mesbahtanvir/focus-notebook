# Places insights prompt execution

The `functions/prompts/places-insights.prompt.yml` file is not wired to any backend job or API route today. It only lives on disk and defines the desired system/user messages and evaluators for a future LLM call.

In the current product flow, the Places detail page still runs a placeholder `handleEnrich` function. That function shows a toast, waits two seconds, and writes hard-coded sample data into Firestore via `updatePlace`; it never calls the YAML prompt or an LLM API. The TODO comment in that handler is the handoff point where a real enrichment call would need to be added.

To actually execute the prompt, you would need to create a backend function that loads the YAML (following the pattern used in `functions/src/services/llmInsightsService.ts` for other prompts), send the structured request to the chosen LLM, and expose an endpoint the UI can call from `handleEnrich`.

## MODIFIED Requirements

### Requirement: Intent classification

The system SHALL call a silent intent step (Ollama) that classifies the prompt into `conversation`, `action`, or `image` before the main model runs. The classifier system prompt SHALL define each intent with a description and at least one example, and SHALL instruct the model to respond with only one word: `conversation`, `action`, or `image`.

#### Scenario: Conversation intent

- **WHEN** the prompt is informational (e.g. "What is the capital of France?" or "how are you")
- **THEN** intent resolves to `conversation`

#### Scenario: Action intent

- **WHEN** the prompt is a device command (e.g. "Open Camera" or "open spotify")
- **THEN** intent resolves to `action`

#### Scenario: Image intent

- **WHEN** the prompt requests searching, viewing, or generating images (e.g. "show me photos of my dog")
- **THEN** intent resolves to `image`

#### Scenario: Classifier uses structured system prompt

- **WHEN** `classifyIntent` calls Ollama
- **THEN** the system prompt includes definitions for `conversation`, `action`, and `image` with examples and requires a single-word response

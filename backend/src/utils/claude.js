import Anthropic from '@anthropic-ai/sdk';

// One-line switch for the model tier used by all AI endpoints.
// Cheaper alternative: 'claude-haiku-4-5' ($1/$5 per MTok vs $5/$25).
export const CLAUDE_MODEL = 'claude-opus-4-8';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Ask Claude for a JSON object matching `schema` and return it parsed.
// Structured outputs guarantee the text block is valid JSON matching the schema.
export async function generateJson({ system, prompt, schema, maxTokens = 8000 }) {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    thinking: { type: 'adaptive' },
    system,
    messages: [{ role: 'user', content: prompt }],
    output_config: {
      format: { type: 'json_schema', schema },
    },
  });

  // Thinking blocks precede the text block; find the text block explicitly.
  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock) {
    throw new Error(`Claude returned no text content (stop_reason: ${response.stop_reason})`);
  }
  return JSON.parse(textBlock.text);
}

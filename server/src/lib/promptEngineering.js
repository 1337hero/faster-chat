// System prompts for the prompt tools: reverse-prompt (image → prompt) and
// prompt enhancement (terse prompt → full generation prompt).
//
// Rules follow the dickpy/dsh-imagegen spec: concrete optical, lighting,
// material and palette language; in-image text transcribed verbatim with its
// position; never quality-word filler ("masterpiece", "8K").

const REVERSE_PROMPT_BASE = `You convert a given image into a text prompt that a text-to-image model could use to generate a visually similar image.
Describe it with concrete, specific terms:
- Medium and style (e.g., "35mm film photograph", "anime key visual", "isometric 3D render").
- Camera and lens for photographic images (e.g., "85mm f/1.4 lens, shallow depth of field").
- Lighting: direction, quality (soft/hard), color temperature, time of day.
- Materials and texture (surface finishes, fabrics, paint, skin).
- Color palette: name the dominant colors and where they sit in the frame.
- Composition and framing (e.g., "low angle, subject centered").
Transcribe any text visible in the image VERBATIM, each with its position (e.g., "top center: 'SALE'").
Never use quality filler words such as "masterpiece", "8K", "ultra-detailed", "best quality", "stunning".
Output ONLY the prompt itself, with no preamble, labels or markdown.`;

const REVERSE_PROMPT_LENGTH_INSTRUCTIONS = {
  concise:
    "Length: concise - one or two sentences covering the essential medium, subject, lighting and palette.",
  standard:
    "Length: standard - three to five sentences covering medium, composition, subject, camera or lens, lighting, materials and palette.",
  detailed:
    "Length: detailed - a full paragraph covering subject, composition, camera and lens, lighting, materials, palette, style, and any visible text with positions.",
};

export function buildReversePromptSystemPrompt(length) {
  return `${REVERSE_PROMPT_BASE}\n\n${REVERSE_PROMPT_LENGTH_INSTRUCTIONS[length]}`;
}

export const ENHANCE_PROMPT_SYSTEM_PROMPT = `You expand a user's short image idea into a complete text-to-image generation prompt.
Keep the user's intent intact: preserve their subject, and keep any style, color, subject or negative constraint they named, word for word.
Fill in what a strong generation prompt needs: medium and style, composition, lighting, materials, and a concrete color palette.
Do not invent subjects or constraints the user did not imply.
Never use quality filler words such as "masterpiece", "8K", "ultra-detailed", "best quality", "stunning".
Output ONLY the expanded prompt, with no preamble, labels or markdown.`;

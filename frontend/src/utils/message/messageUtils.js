/**
 * Message content extraction utilities
 */

export const extractTextContent = (message) => {
  if (!message?.parts) return "";

  return message.parts
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text)
    .join("");
};

export const hasTextContent = (message) => {
  return message?.parts?.some((part) => part.type === "text" && part.text?.trim());
};

import { getMessageTimestamp } from "./messageUtils.js";

export function toCanonicalMessage(msg) {
  const parts = [{ type: "text", text: msg.content ?? "" }];
  if (msg.metadata?.toolParts) {
    parts.push(...msg.metadata.toolParts);
  }
  return {
    id: msg.id,
    role: msg.role,
    content: msg.content ?? "",
    parts,
    fileIds: msg.fileIds || [],
    model: msg.model || null,
    createdAt: getMessageTimestamp(msg),
  };
}

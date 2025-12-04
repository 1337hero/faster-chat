import { MESSAGE_CONSTANTS } from "@faster-chat/shared";

/**
 * Get timestamp from a message, handling both camelCase and snake_case formats
 * @param {object} message - Message object
 * @param {*} defaultValue - Default value if no timestamp found (default: Date.now())
 * @returns {number} Timestamp value
 */
export function getMessageTimestamp(message, defaultValue = Date.now()) {
  return message.createdAt ?? message.created_at ?? defaultValue;
}

export function ensureTimestamp(message, timestampsRef) {
  const existing = getMessageTimestamp(message, null);
  if (existing) {
    if (message.id && timestampsRef) {
      timestampsRef.current.set(message.id, existing);
    }
    return { ...message, createdAt: existing };
  }

  if (message.id && timestampsRef?.current?.has(message.id)) {
    return { ...message, createdAt: timestampsRef.current.get(message.id) };
  }

  const now = Date.now();
  if (message.id && timestampsRef) {
    timestampsRef.current.set(message.id, now);
  }
  return { ...message, createdAt: now };
}

export function deduplicateMessages(messages) {
  const seenIds = new Set();
  const seenContentWindow = new Map();

  return messages.filter((msg) => {
    const content = msg.parts?.map((p) => p.text).join("") || "";
    const timestamp = getMessageTimestamp(msg);
    const bucket = Math.floor(timestamp / MESSAGE_CONSTANTS.DEDUPLICATION_WINDOW_MS);
    const contentKey = `${msg.role}:${content}:${bucket}`;

    if (msg.id && seenIds.has(msg.id)) return false;
    if (seenContentWindow.has(contentKey)) return false;

    if (msg.id) seenIds.add(msg.id);
    seenContentWindow.set(contentKey, true);
    return true;
  });
}

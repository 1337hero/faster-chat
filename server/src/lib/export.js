import { dbUtils } from "./db.js";
import { EXPORT_CONSTANTS } from "@faster-chat/shared";

const ROLE_LABELS = { user: "User", assistant: "Assistant", system: "System" };

function serializeFolder(folder) {
  return { id: folder.id, name: folder.name, color: folder.color, position: folder.position };
}

function serializeChat(chat, userId) {
  const messages = dbUtils.getAllMessagesByChatAndUser(chat.id, userId);
  const fileIds = [...new Set(messages.flatMap((m) => m.file_ids ?? []))];
  const filesById = new Map(dbUtils.getFilesByIdsForUser(fileIds, userId).map((f) => [f.id, f]));

  return {
    id: chat.id,
    title: chat.title,
    folderId: chat.folder_id,
    createdAt: chat.created_at,
    updatedAt: chat.updated_at,
    pinnedAt: chat.pinned_at,
    archivedAt: chat.archived_at,
    memoryDisabled: !!chat.memory_disabled,
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      model: m.model,
      createdAt: m.created_at,
      metadata: m.metadata ?? null,
      attachments: (m.file_ids ?? [])
        .map((id) => filesById.get(id))
        .filter(Boolean)
        .map((f) => ({ fileId: f.id, filename: f.filename, mimeType: f.mime_type, size: f.size })),
    })),
  };
}

function buildExport(userId, chats, folders) {
  return {
    version: EXPORT_CONSTANTS.FORMAT_VERSION,
    exportedAt: Date.now(),
    source: EXPORT_CONSTANTS.SOURCE,
    folders: folders.map(serializeFolder),
    chats: chats.map((chat) => serializeChat(chat, userId)),
  };
}

export function exportChat(userId, chat) {
  const folder = chat.folder_id ? dbUtils.getFolderByIdAndUser(chat.folder_id, userId) : null;
  return buildExport(userId, [chat], folder ? [folder] : []);
}

export function exportAllChats(userId) {
  const chats = dbUtils
    .getAllChatsByUserId(userId)
    .filter((chat) => dbUtils.getMessageCountByChat(chat.id) > 0);
  return buildExport(userId, chats, dbUtils.getFoldersByUserId(userId));
}

export function chatToMarkdown(userId, chat) {
  const messages = dbUtils.getAllMessagesByChatAndUser(chat.id, userId);
  const models = [...new Set(messages.map((m) => m.model).filter(Boolean))];

  const header = [`# ${chat.title || "New Chat"}`, ""];
  if (models.length > 0) {
    header.push(`- Model: ${models.join(", ")}`);
  }
  header.push(`- Created: ${new Date(chat.created_at).toISOString()}`);
  header.push(`- Updated: ${new Date(chat.updated_at).toISOString()}`);

  const turns = messages.map((m) =>
    [
      "---",
      "",
      `## ${ROLE_LABELS[m.role] ?? m.role}`,
      "",
      `_${new Date(m.created_at).toISOString()}_`,
      "",
      m.content,
      "",
    ].join("\n")
  );

  return [...header, "", ...turns, ""].join("\n");
}

export function exportFilename(title, extension) {
  const slug = (title || "chat")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "");
  return `${slug || "chat"}.${extension}`;
}

export function contentDisposition(asciiFilename, originalTitle = null) {
  const utf8 = originalTitle
    ? encodeURIComponent([...originalTitle.trim()].slice(0, 60).join(""))
    : null;
  const extension = asciiFilename.slice(asciiFilename.lastIndexOf("."));
  const star = utf8 ? `; filename*=UTF-8''${utf8}${extension}` : "";
  return `attachment; filename="${asciiFilename}"${star}`;
}

export function allExportFilename() {
  const date = new Date().toISOString().slice(0, 10);
  return `faster-chat-export-${date}.json`;
}

/**
 * Query key factories for TanStack Query
 * Centralized here to avoid circular imports between hooks
 * Each factory includes userId to prevent cache bleed between users
 */

export const chatKeys = {
  all: (userId) => ["chats", userId],
  list: (userId) => [...chatKeys.all(userId), "list"],
  details: (userId) => [...chatKeys.all(userId), "detail"],
  detail: (userId, id) => [...chatKeys.details(userId), id],
  messages: (userId, chatId) => [...chatKeys.detail(userId, chatId), "messages"],
};

export const folderKeys = {
  all: (userId) => ["folders", userId],
  list: (userId) => [...folderKeys.all(userId), "list"],
  details: (userId) => [...folderKeys.all(userId), "detail"],
  detail: (userId, folderId) => [...folderKeys.details(userId), folderId],
  chats: (userId, folderId) => [...folderKeys.detail(userId, folderId), "chats"],
};

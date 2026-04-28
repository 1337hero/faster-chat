export function sortChatsLikeServer(chats) {
  return [...chats].sort((a, b) => {
    const aPinned = a.pinnedAt ? 0 : 1;
    const bPinned = b.pinnedAt ? 0 : 1;
    if (aPinned !== bPinned) {
      return aPinned - bPinned;
    }
    if (a.pinnedAt && b.pinnedAt && a.pinnedAt !== b.pinnedAt) {
      return b.pinnedAt - a.pinnedAt;
    }
    return b.updatedAt - a.updatedAt;
  });
}

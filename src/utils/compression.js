export const compressMessage = (message) => {
  const trimmedContent = message.content.trim().replace(/\s+/g, ' ');
  
  return {
    role: message.role,
    content: trimmedContent
  };
};

export const compressMessages = (messages) => {
  return messages.map(compressMessage);
};
import { useNavigate } from "@tanstack/react-router";
import { useUiState } from "@/state/useUiState";

export function useChatNavigation() {
  const navigate = useNavigate();
  const setWebSearchEnabled = useUiState((state) => state.setWebSearchEnabled);

  function navigateToChat(chatId, options = {}) {
    setWebSearchEnabled(false);
    return navigate({
      to: "/chat/$chatId",
      params: { chatId },
      ...options,
    });
  }

  return { navigateToChat };
}

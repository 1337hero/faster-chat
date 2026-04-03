import { useAuthState } from "@/state/useAuthState";
import {
  hasSeenAdminConnectionsOnboarding,
  markAdminConnectionsOnboardingSeen,
} from "@/lib/adminOnboarding";
import { useChatNavigation } from "@/hooks/useChatNavigation";
import { useChatsQuery, useCreateChatMutation } from "@/hooks/useChatsQuery";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "preact/hooks";

export function IndexRouteGuard() {
  const navigate = useNavigate();
  const { navigateToChat } = useChatNavigation();
  const { user } = useAuthState();
  const { data: chats, isLoading } = useChatsQuery();
  const createChatMutation = useCreateChatMutation();
  const hasStartedNavigation = useRef(false);

  useEffect(() => {
    if (!user || isLoading || hasStartedNavigation.current) return;
    hasStartedNavigation.current = true;

    const hasSeenOnboarding = hasSeenAdminConnectionsOnboarding(user.id);

    // Admin onboarding: redirect to connections if no chats and hasn't seen it
    if (user.role === "admin" && (!chats || chats.length === 0) && !hasSeenOnboarding) {
      markAdminConnectionsOnboardingSeen(user.id);
      navigate({
        to: "/admin",
        search: { tab: "connections" },
        replace: true,
      });
      return;
    }

    // Navigate to existing chat or create new one
    if (chats && chats.length > 0) {
      navigateToChat(chats[0].id, { replace: true });
    } else {
      createChatMutation.mutate(
        {},
        {
          onSuccess: (newChat) => {
            navigateToChat(newChat.id, { replace: true });
          },
          onError: () => {
            hasStartedNavigation.current = false;
          },
        }
      );
    }
  }, [navigate, navigateToChat, user, chats, isLoading, createChatMutation]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-theme-text-muted">{isLoading ? "Loading..." : "Redirecting..."}</div>
    </div>
  );
}

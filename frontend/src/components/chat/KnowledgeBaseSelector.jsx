import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Database } from "lucide-preact";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

export function KnowledgeBaseSelector({ chatId }) {
  const queryClient = useQueryClient();

  const { data: kbsData } = useQuery({
    queryKey: ["knowledge-bases"],
    queryFn: () => apiFetch("/api/knowledge-bases"),
  });

  const { data: enabledData } = useQuery({
    queryKey: ["chat-knowledge-bases", chatId],
    queryFn: () => apiFetch(`/api/knowledge-bases/chat/${chatId}/enabled`),
    enabled: !!chatId,
  });

  const toggleKB = useMutation({
    mutationFn: ({ kbId, enabled }) =>
      apiFetch(`/api/knowledge-bases/chat/${chatId}/enable/${kbId}`, {
        method: enabled ? "DELETE" : "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(["chat-knowledge-bases", chatId]);
      toast.success("Knowledge base updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const knowledgeBases = kbsData?.knowledgeBases || [];
  const enabledKBs = enabledData?.knowledgeBases || [];
  const enabledIds = new Set(enabledKBs.map((kb) => kb.id));

  if (knowledgeBases.length === 0) {
    return null;
  }

  return (
    <Popover className="relative">
      <PopoverButton
        className={`rounded-lg p-2 transition-colors ${
          enabledKBs.length > 0
            ? "bg-theme-primary/20 text-theme-primary hover:bg-theme-primary/30"
            : "text-theme-text-muted hover:bg-theme-surface-strong"
        }`}
        title="Knowledge Bases">
        <Database className="h-4 w-4" />
      </PopoverButton>

      <PopoverPanel className="bg-theme-surface border-theme-border absolute right-0 bottom-full z-20 mb-2 max-h-64 w-64 overflow-y-auto rounded-lg border shadow-lg">
        <div className="border-theme-border border-b p-2">
          <div className="text-theme-text text-sm font-medium">Knowledge Bases</div>
          <div className="text-theme-text-muted text-xs">Enable RAG for this conversation</div>
        </div>
        <div className="p-1">
          {knowledgeBases.map((kb) => {
            const isEnabled = enabledIds.has(kb.id);
            return (
              <button
                key={kb.id}
                onClick={() => toggleKB.mutate({ kbId: kb.id, enabled: isEnabled })}
                className="hover:bg-theme-surface-strong flex w-full items-center gap-2 rounded p-2 text-left text-sm">
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded border ${
                    isEnabled ? "bg-theme-primary border-theme-primary" : "border-theme-border"
                  }`}>
                  {isEnabled && <Check className="text-theme-text h-3 w-3" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-theme-text truncate">{kb.name}</div>
                  {kb.description && (
                    <div className="text-theme-text-muted truncate text-xs">{kb.description}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </PopoverPanel>
    </Popover>
  );
}

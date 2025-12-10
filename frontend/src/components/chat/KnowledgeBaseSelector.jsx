import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Database } from "lucide-preact";
import { useState } from "preact/hooks";
import { toast } from "sonner";

export function KnowledgeBaseSelector({ chatId }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch all knowledge bases
  const { data: kbsData } = useQuery({
    queryKey: ["knowledge-bases"],
    queryFn: async () => {
      const res = await fetch("/api/knowledge-bases", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch knowledge bases");
      return res.json();
    },
  });

  // Fetch enabled knowledge bases for this chat
  const { data: enabledData } = useQuery({
    queryKey: ["chat-knowledge-bases", chatId],
    queryFn: async () => {
      const res = await fetch(`/api/knowledge-bases/chat/${chatId}/enabled`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch enabled knowledge bases");
      return res.json();
    },
    enabled: !!chatId,
  });

  // Toggle knowledge base
  const toggleKB = useMutation({
    mutationFn: async ({ kbId, enabled }) => {
      const url = `/api/knowledge-bases/chat/${chatId}/enable/${kbId}`;
      const res = await fetch(url, {
        method: enabled ? "DELETE" : "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle knowledge base");
      return res.json();
    },
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
    <div class="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        class={`rounded-lg p-2 transition-colors ${
          enabledKBs.length > 0
            ? "bg-primary/20 text-primary hover:bg-primary/30"
            : "text-muted-foreground hover:bg-muted"
        }`}
        title="Knowledge Bases">
        <Database class="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          <div class="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div class="bg-card border-border absolute right-0 bottom-full z-20 mb-2 max-h-64 w-64 overflow-y-auto rounded-lg border shadow-lg">
            <div class="border-border border-b p-2">
              <div class="text-sm font-medium">Knowledge Bases</div>
              <div class="text-muted-foreground text-xs">Enable RAG for this conversation</div>
            </div>
            <div class="p-1">
              {knowledgeBases.map((kb) => {
                const isEnabled = enabledIds.has(kb.id);
                return (
                  <button
                    key={kb.id}
                    onClick={() => toggleKB.mutate({ kbId: kb.id, enabled: isEnabled })}
                    class="hover:bg-muted flex w-full items-center gap-2 rounded p-2 text-left text-sm">
                    <div
                      class={`flex h-4 w-4 items-center justify-center rounded border ${
                        isEnabled ? "bg-primary border-primary" : "border-border"
                      }`}>
                      {isEnabled && <Check class="text-primary-foreground h-3 w-3" />}
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="truncate">{kb.name}</div>
                      {kb.description && (
                        <div class="text-muted-foreground truncate text-xs">{kb.description}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

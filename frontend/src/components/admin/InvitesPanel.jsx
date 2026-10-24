import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminClient } from "@/lib/adminClient";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/formatters";

const inviteUrl = (token) => `${window.location.origin}/invite/${token}`;

const inviteStatus = (invite) => {
  if (invite.used_at) return "used";
  if (invite.revoked_at) return "revoked";
  if (invite.expires_at <= Date.now()) return "expired";
  return "active";
};

const copyLink = async (token) => {
  try {
    await navigator.clipboard.writeText(inviteUrl(token));
    toast.success("Invite link copied");
  } catch {
    toast.error("Could not copy link");
  }
};

const InvitesPanel = () => {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["admin", "invites"],
    queryFn: () => adminClient.getInvites(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "invites"] });

  const createMutation = useMutation({
    mutationFn: () => adminClient.createInvite(),
    onSuccess: ({ invite }) => {
      invalidate();
      copyLink(invite.token);
    },
    onError: (err) => toast.error(err.message || "Failed to create invite"),
  });

  const revokeMutation = useMutation({
    mutationFn: (id) => adminClient.revokeInvite(id),
    onSuccess: () => {
      invalidate();
      toast.success("Invite revoked");
    },
    onError: (err) => toast.error(err.message || "Failed to revoke invite"),
  });

  const activeInvites = (data?.invites || []).filter((i) => inviteStatus(i) === "active");

  return (
    <div className="border-theme-surface bg-theme-canvas-alt rounded-lg border px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-theme-text text-sm font-semibold">Invite links</h3>
          <p className="text-theme-text-muted text-xs">
            Single-use, expire in 7 days. New users join as members.
          </p>
        </div>
        <Button outline onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
          {createMutation.isPending ? "Creating..." : "New invite link"}
        </Button>
      </div>

      {activeInvites.length > 0 && (
        <ul className="border-theme-surface mt-3 divide-y border-t text-sm">
          {activeInvites.map((invite) => (
            <li key={invite.id} className="flex items-center justify-between gap-4 py-2">
              <div className="min-w-0">
                <code className="text-theme-text block truncate text-xs">
                  {inviteUrl(invite.token)}
                </code>
                <span className="text-theme-text-muted text-xs">
                  Created {formatRelativeTime(invite.created_at)} by {invite.created_by_username}
                  {" · "}expires {formatRelativeTime(invite.expires_at)}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyLink(invite.token)}
                  className="text-theme-blue text-xs hover:underline">
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => revokeMutation.mutate(invite.id)}
                  className="text-theme-red text-xs hover:underline">
                  Revoke
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default InvitesPanel;

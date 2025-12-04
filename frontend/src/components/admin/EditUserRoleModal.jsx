import { useState } from "preact/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminClient } from "@/lib/adminClient";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";

const EditUserRoleModal = ({ user, isOpen, onClose }) => {
  const [role, setRole] = useState(user?.role || "member");
  const [error, setError] = useState("");

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: () => adminClient.updateUserRole(user.id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      onClose();
      setError("");
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    updateMutation.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Change Role: ${user?.username}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-theme-text block text-sm font-medium">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border-theme-surface-strong bg-theme-canvas text-theme-text focus:border-theme-blue mt-1 w-full rounded-lg border px-4 py-2 focus:outline-none">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="readonly">Read Only</option>
          </select>
          <p className="text-theme-text-muted mt-2 text-sm">
            Changing role will invalidate all active sessions for this user.
          </p>
        </div>

        {error && (
          <div className="bg-theme-red/10 text-theme-red rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" plain onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" color="blue" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Updating..." : "Update Role"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditUserRoleModal;

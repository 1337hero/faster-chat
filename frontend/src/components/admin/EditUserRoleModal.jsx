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
          <label className="block text-sm font-medium text-latte-text dark:text-macchiato-text">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 w-full rounded-lg border border-latte-surface1 bg-latte-base px-4 py-2 text-latte-text focus:border-latte-blue focus:outline-none dark:border-macchiato-surface1 dark:bg-macchiato-mantle dark:text-macchiato-text dark:focus:border-macchiato-blue"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="readonly">Read Only</option>
          </select>
          <p className="mt-2 text-sm text-latte-subtext0 dark:text-macchiato-subtext0">
            Changing role will invalidate all active sessions for this user.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-latte-red/10 px-4 py-3 text-sm text-latte-red dark:bg-macchiato-red/10 dark:text-macchiato-red">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" plain onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            color="blue"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Updating..." : "Update Role"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditUserRoleModal;

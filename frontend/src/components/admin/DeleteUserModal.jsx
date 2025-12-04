import { useState } from "preact/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminClient } from "@/lib/adminClient";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";

const DeleteUserModal = ({ user, isOpen, onClose }) => {
  const [error, setError] = useState("");

  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => adminClient.deleteUser(user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      onClose();
      setError("");
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleDelete = () => {
    setError("");
    deleteMutation.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete User">
      <div className="space-y-4">
        <p className="text-latte-text dark:text-macchiato-text">
          Are you sure you want to delete <strong>{user?.username}</strong>? This action cannot be
          undone.
        </p>

        <div className="bg-latte-red/10 text-latte-red dark:bg-macchiato-red/10 dark:text-macchiato-red rounded-lg px-4 py-3 text-sm">
          <p className="font-medium">Warning:</p>
          <ul className="mt-1 ml-4 list-disc">
            <li>All user data will be permanently deleted</li>
            <li>All active sessions will be terminated</li>
            <li>This action cannot be reversed</li>
          </ul>
        </div>

        {error && (
          <div className="bg-latte-red/10 text-latte-red dark:bg-macchiato-red/10 dark:text-macchiato-red rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" plain onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            color="red"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? "Deleting..." : "Delete User"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteUserModal;

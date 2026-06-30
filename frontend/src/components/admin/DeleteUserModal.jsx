import { useState } from "preact/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminClient } from "@/lib/adminClient";
import Modal from "@/components/ui/Modal";
import ModalActions from "@/components/ui/ModalActions";
import FormError from "@/components/ui/FormError";

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
        <p className="text-theme-text">
          Are you sure you want to delete <strong>{user?.username}</strong>? This action cannot be
          undone.
        </p>

        <div className="bg-theme-red/10 text-theme-red rounded-lg px-4 py-3 text-sm">
          <p className="font-medium">Warning:</p>
          <ul className="mt-1 ml-4 list-disc">
            <li>All user data will be permanently deleted</li>
            <li>All active sessions will be terminated</li>
            <li>This action cannot be reversed</li>
          </ul>
        </div>

        <FormError error={error} />

        <ModalActions
          onCancel={onClose}
          onSubmit={handleDelete}
          submitType="button"
          color="red"
          pending={deleteMutation.isPending}
          label="Delete User"
          pendingLabel="Deleting..."
        />
      </div>
    </Modal>
  );
};

export default DeleteUserModal;

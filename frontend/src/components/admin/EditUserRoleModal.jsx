import { useState } from "preact/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminClient } from "@/lib/adminClient";
import Modal from "@/components/ui/Modal";
import ModalActions from "@/components/ui/ModalActions";
import FormError from "@/components/ui/FormError";
import RoleSelect from "@/components/admin/RoleSelect";

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
          <label htmlFor="edit-user-role" className="text-theme-text block text-sm font-medium">
            Role
          </label>
          <RoleSelect id="edit-user-role" value={role} onChange={setRole} />
          <p className="text-theme-text-muted mt-2 text-sm">
            Changing role will invalidate all active sessions for this user.
          </p>
        </div>

        <FormError error={error} />

        <ModalActions
          onCancel={onClose}
          pending={updateMutation.isPending}
          label="Update Role"
          pendingLabel="Updating..."
        />
      </form>
    </Modal>
  );
};

export default EditUserRoleModal;

import { useState } from "preact/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminClient } from "@/lib/adminClient";
import Modal from "@/components/ui/Modal";
import ModalActions from "@/components/ui/ModalActions";
import FormError from "@/components/ui/FormError";
import RoleSelect from "@/components/admin/RoleSelect";

const CreateUserModal = ({ isOpen, onClose }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("member");
  const [error, setError] = useState("");

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () => adminClient.createUser(username, password, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      onClose();
      setUsername("");
      setPassword("");
      setRole("member");
      setError("");
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Username and password are required");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    createMutation.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New User">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="create-user-username"
            className="text-theme-text block text-sm font-medium">
            Username
          </label>
          <input
            id="create-user-username"
            type="text"
            value={username}
            onInput={(e) => setUsername(e.target.value)}
            className="border-theme-surface-strong bg-theme-canvas text-theme-text focus:border-theme-blue mt-1 w-full rounded-lg border px-4 py-2 focus:outline-none"
            placeholder="Enter username"
          />
        </div>

        <div>
          <label
            htmlFor="create-user-password"
            className="text-theme-text block text-sm font-medium">
            Password
          </label>
          <input
            id="create-user-password"
            type="password"
            value={password}
            onInput={(e) => setPassword(e.target.value)}
            className="border-theme-surface-strong bg-theme-canvas text-theme-text focus:border-theme-blue mt-1 w-full rounded-lg border px-4 py-2 focus:outline-none"
            placeholder="Minimum 8 characters"
          />
        </div>

        <div>
          <label htmlFor="create-user-role" className="text-theme-text block text-sm font-medium">
            Role
          </label>
          <RoleSelect id="create-user-role" value={role} onChange={setRole} />
        </div>

        <FormError error={error} />

        <ModalActions
          onCancel={onClose}
          pending={createMutation.isPending}
          label="Create User"
          pendingLabel="Creating..."
        />
      </form>
    </Modal>
  );
};

export default CreateUserModal;

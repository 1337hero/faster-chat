import { useState } from "preact/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminClient } from "@/lib/adminClient";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";

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
          <label className="block text-sm font-medium text-latte-text dark:text-macchiato-text">
            Username
          </label>
          <input
            type="text"
            value={username}
            onInput={(e) => setUsername(e.target.value)}
            className="mt-1 w-full rounded-lg border border-latte-surface1 bg-latte-base px-4 py-2 text-latte-text focus:border-latte-blue focus:outline-none dark:border-macchiato-surface1 dark:bg-macchiato-mantle dark:text-macchiato-text dark:focus:border-macchiato-blue"
            placeholder="Enter username"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-latte-text dark:text-macchiato-text">
            Password
          </label>
          <input
            type="password"
            value={password}
            onInput={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-latte-surface1 bg-latte-base px-4 py-2 text-latte-text focus:border-latte-blue focus:outline-none dark:border-macchiato-surface1 dark:bg-macchiato-mantle dark:text-macchiato-text dark:focus:border-macchiato-blue"
            placeholder="Minimum 8 characters"
          />
        </div>

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
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create User"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateUserModal;

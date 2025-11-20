import { useState } from "preact/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminClient } from "@/lib/adminClient";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";

const ResetPasswordModal = ({ user, isOpen, onClose }) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const queryClient = useQueryClient();

  const resetMutation = useMutation({
    mutationFn: () => adminClient.resetUserPassword(user.id, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      onClose();
      setPassword("");
      setConfirmPassword("");
      setError("");
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("Both password fields are required");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    resetMutation.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Reset Password: ${user?.username}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-latte-text dark:text-macchiato-text">
            New Password
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
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onInput={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-latte-surface1 bg-latte-base px-4 py-2 text-latte-text focus:border-latte-blue focus:outline-none dark:border-macchiato-surface1 dark:bg-macchiato-mantle dark:text-macchiato-text dark:focus:border-macchiato-blue"
            placeholder="Re-enter password"
          />
          <p className="mt-2 text-sm text-latte-subtext0 dark:text-macchiato-subtext0">
            Resetting password will invalidate all active sessions for this user.
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
            color="orange"
            disabled={resetMutation.isPending}
          >
            {resetMutation.isPending ? "Resetting..." : "Reset Password"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ResetPasswordModal;

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
          <label className="text-latte-text dark:text-macchiato-text block text-sm font-medium">
            New Password
          </label>
          <input
            type="password"
            value={password}
            onInput={(e) => setPassword(e.target.value)}
            className="border-latte-surface1 bg-latte-base text-latte-text focus:border-latte-blue dark:border-macchiato-surface1 dark:bg-macchiato-mantle dark:text-macchiato-text dark:focus:border-macchiato-blue mt-1 w-full rounded-lg border px-4 py-2 focus:outline-none"
            placeholder="Minimum 8 characters"
          />
        </div>

        <div>
          <label className="text-latte-text dark:text-macchiato-text block text-sm font-medium">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onInput={(e) => setConfirmPassword(e.target.value)}
            className="border-latte-surface1 bg-latte-base text-latte-text focus:border-latte-blue dark:border-macchiato-surface1 dark:bg-macchiato-mantle dark:text-macchiato-text dark:focus:border-macchiato-blue mt-1 w-full rounded-lg border px-4 py-2 focus:outline-none"
            placeholder="Re-enter password"
          />
          <p className="text-latte-subtext0 dark:text-macchiato-subtext0 mt-2 text-sm">
            Resetting password will invalidate all active sessions for this user.
          </p>
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
          <Button type="submit" color="orange" disabled={resetMutation.isPending}>
            {resetMutation.isPending ? "Resetting..." : "Reset Password"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ResetPasswordModal;

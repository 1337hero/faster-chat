import { useState } from "preact/hooks";
import { useQuery } from "@tanstack/react-query";
import { useAuthState } from "@/state/useAuthState";
import { authClient } from "@/lib/authClient";
import { Button } from "@/components/ui/button";

const AuthPage = ({ inviteToken }) => {
  const { data: setup } = useQuery({
    queryKey: ["auth", "setup"],
    queryFn: () => authClient.getSetup(),
  });
  const { data: inviteValid, isLoading: inviteLoading } = useQuery({
    queryKey: ["auth", "invite", inviteToken],
    queryFn: () => authClient.validateInvite(inviteToken),
    enabled: Boolean(inviteToken),
  });

  const needsSetup = setup?.needsSetup === true;
  const hasInvite = Boolean(inviteToken) && inviteValid === true;
  const canRegister = needsSetup || hasInvite;
  const inviteInvalid = Boolean(inviteToken) && !inviteLoading && inviteValid === false;

  const [isLogin, setIsLogin] = useState(!inviteToken);
  const showRegister = !isLogin && canRegister;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { login, register, isLoading, error, clearError } = useAuthState();
  const [validationError, setValidationError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setValidationError("");

    try {
      if (!showRegister) {
        await login(username, password);
      } else {
        if (password !== confirmPassword) {
          setValidationError("Passwords do not match");
          return;
        }
        await register(username, password, inviteToken);
      }
    } catch (err) {
      console.error("Auth error:", err);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    clearError();
    setValidationError("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="bg-theme-canvas flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="border-theme-surface bg-theme-canvas-alt rounded-lg border p-8 shadow-lg">
          <h1 className="text-theme-text mb-6 text-center text-2xl font-bold">
            {showRegister ? "Create Account" : "Sign In"}
          </h1>

          {inviteInvalid && (
            <div className="bg-theme-red/10 text-theme-red mb-4 rounded-md p-3 text-sm">
              This invite link is invalid, expired, or already used. Ask an administrator for a new
              one.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="text-theme-text-subtle mb-1 block text-sm font-medium">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onInput={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                autoComplete="username"
                className="border-theme-surface bg-theme-canvas text-theme-text focus:border-theme-blue focus:ring-theme-blue w-full rounded-md border px-3 py-2 focus:ring-1 focus:outline-none"
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-theme-text-subtle mb-1 block text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onInput={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={showRegister ? "new-password" : "current-password"}
                className="border-theme-surface bg-theme-canvas text-theme-text focus:border-theme-blue focus:ring-theme-blue w-full rounded-md border px-3 py-2 focus:ring-1 focus:outline-none"
                disabled={isLoading}
              />
            </div>

            {showRegister && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="text-theme-text-subtle mb-1 block text-sm font-medium">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onInput={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="border-theme-surface bg-theme-canvas text-theme-text focus:border-theme-blue focus:ring-theme-blue w-full rounded-md border px-3 py-2 focus:ring-1 focus:outline-none"
                  disabled={isLoading}
                />
              </div>
            )}

            {(error || validationError) && (
              <div className="bg-theme-red/10 text-theme-red rounded-md p-3 text-sm">
                {validationError || error}
              </div>
            )}

            <Button type="submit" color="blue" className="w-full" disabled={isLoading}>
              {isLoading ? "Please wait..." : showRegister ? "Create Account" : "Sign In"}
            </Button>
          </form>

          {canRegister && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={toggleMode}
                className="text-theme-blue text-sm hover:underline"
                disabled={isLoading}>
                {showRegister
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Create one"}
              </button>
            </div>
          )}
        </div>

        {showRegister && needsSetup && (
          <div className="bg-theme-surface/50 text-theme-text-muted mt-4 rounded-md p-4 text-sm">
            <p className="font-semibold">First user becomes admin</p>
            <p className="mt-1">The first account created will have admin privileges.</p>
          </div>
        )}

        {showRegister && hasInvite && (
          <div className="bg-theme-surface/50 text-theme-text-muted mt-4 rounded-md p-4 text-sm">
            <p className="font-semibold">You've been invited</p>
            <p className="mt-1">Pick a username and password to create your account.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthPage;

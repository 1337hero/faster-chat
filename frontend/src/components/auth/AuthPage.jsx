import { useState } from "preact/hooks";
import { useAuthState } from "@/state/useAuthState";
import { Button } from "@/components/ui/button";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { login, register, isLoading, error, clearError } = useAuthState();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    try {
      if (isLogin) {
        await login(username, password);
      } else {
        if (password !== confirmPassword) {
          alert("Passwords do not match");
          return;
        }
        await register(username, password);
      }
      // Auth state will update and Login component will handle redirect
    } catch (err) {
      console.error("Auth error:", err);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    clearError();
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="bg-theme-canvas flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="border-theme-surface bg-theme-canvas-alt rounded-lg border p-8 shadow-lg">
          <h1 className="text-theme-text mb-6 text-center text-2xl font-bold">
            {isLogin ? "Sign In" : "Create Account"}
          </h1>

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
                autoComplete={isLogin ? "current-password" : "new-password"}
                className="border-theme-surface bg-theme-canvas text-theme-text focus:border-theme-blue focus:ring-theme-blue w-full rounded-md border px-3 py-2 focus:ring-1 focus:outline-none"
                disabled={isLoading}
              />
            </div>

            {!isLogin && (
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

            {error && (
              <div className="bg-theme-red/10 text-theme-red rounded-md p-3 text-sm">{error}</div>
            )}

            <Button type="submit" color="blue" className="w-full" disabled={isLoading}>
              {isLoading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-theme-blue text-sm hover:underline"
              disabled={isLoading}>
              {isLogin ? "Don't have an account? Create one" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        {!isLogin && (
          <div className="bg-theme-surface/50 text-theme-text-muted mt-4 rounded-md p-4 text-sm">
            <p className="font-semibold">First user becomes admin</p>
            <p className="mt-1">The first account created will have admin privileges.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthPage;

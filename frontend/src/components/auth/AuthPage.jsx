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
    <div className="bg-latte-base dark:bg-macchiato-base flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="border-latte-surface0 bg-latte-mantle dark:border-macchiato-surface0 dark:bg-macchiato-mantle rounded-lg border p-8 shadow-lg">
          <h1 className="text-latte-text dark:text-macchiato-text mb-6 text-center text-2xl font-bold">
            {isLogin ? "Sign In" : "Create Account"}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="text-latte-subtext1 dark:text-macchiato-subtext1 mb-1 block text-sm font-medium">
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
                className="border-latte-surface0 bg-latte-base text-latte-text focus:border-latte-blue focus:ring-latte-blue dark:border-macchiato-surface0 dark:bg-macchiato-base dark:text-macchiato-text dark:focus:border-macchiato-blue dark:focus:ring-macchiato-blue w-full rounded-md border px-3 py-2 focus:ring-1 focus:outline-none"
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-latte-subtext1 dark:text-macchiato-subtext1 mb-1 block text-sm font-medium">
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
                className="border-latte-surface0 bg-latte-base text-latte-text focus:border-latte-blue focus:ring-latte-blue dark:border-macchiato-surface0 dark:bg-macchiato-base dark:text-macchiato-text dark:focus:border-macchiato-blue dark:focus:ring-macchiato-blue w-full rounded-md border px-3 py-2 focus:ring-1 focus:outline-none"
                disabled={isLoading}
              />
            </div>

            {!isLogin && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="text-latte-subtext1 dark:text-macchiato-subtext1 mb-1 block text-sm font-medium">
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
                  className="border-latte-surface0 bg-latte-base text-latte-text focus:border-latte-blue focus:ring-latte-blue dark:border-macchiato-surface0 dark:bg-macchiato-base dark:text-macchiato-text dark:focus:border-macchiato-blue dark:focus:ring-macchiato-blue w-full rounded-md border px-3 py-2 focus:ring-1 focus:outline-none"
                  disabled={isLoading}
                />
              </div>
            )}

            {error && (
              <div className="bg-latte-red/10 text-latte-red dark:bg-macchiato-red/10 dark:text-macchiato-red rounded-md p-3 text-sm">
                {error}
              </div>
            )}

            <Button type="submit" color="blue" className="w-full" disabled={isLoading}>
              {isLoading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-latte-blue dark:text-macchiato-blue text-sm hover:underline"
              disabled={isLoading}>
              {isLogin ? "Don't have an account? Create one" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        {!isLogin && (
          <div className="bg-latte-surface0/50 text-latte-subtext0 dark:bg-macchiato-surface0/50 dark:text-macchiato-subtext0 mt-4 rounded-md p-4 text-sm">
            <p className="font-semibold">First user becomes admin</p>
            <p className="mt-1">The first account created will have admin privileges.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthPage;

import { useEffect } from "preact/hooks";
import { Navigate } from "@tanstack/react-router";
import AuthPage from "@/components/auth/AuthPage";
import { useAuthState } from "@/state/useAuthState";

const Login = () => {
  const { user, isLoading, checkSession } = useAuthState();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  if (user) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div className="bg-theme-canvas flex min-h-screen items-center justify-center">
        <div className="text-theme-text-muted">Loading...</div>
      </div>
    );
  }

  return <AuthPage />;
};

export default Login;

import { useEffect } from "preact/hooks";
import { Navigate } from "@tanstack/react-router";
import AuthPage from "@/components/auth/AuthPage";
import { useAuthState } from "@/state/useAuthState";

const Login = () => {
  const { user, checkSession } = useAuthState();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <AuthPage />;
};

export default Login;

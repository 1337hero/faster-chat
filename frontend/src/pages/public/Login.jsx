import { Navigate } from "@tanstack/react-router";
import AuthPage from "@/components/auth/AuthPage";
import { useAuthState } from "@/state/useAuthState";

const Login = () => {
  const user = useAuthState((state) => state.user);

  // If already logged in, redirect to home
  if (user) {
    return <Navigate to="/" replace />;
  }

  return <AuthPage />;
};

export default Login;

import { useEffect } from 'preact/hooks';
import { useNavigate } from '@tanstack/react-router';
import AuthPage from '@/components/auth/AuthPage';
import { useAuthState } from '@/state/useAuthState';

const Login = () => {
  const { user, checkSession } = useAuthState();
  const navigate = useNavigate();

  // Check session on mount and redirect if already logged in
  useEffect(() => {
    checkSession().then(user => {
      if (user) {
        navigate({ to: '/', replace: true });
      }
    });
  }, []);

  if (user) {
    return null; // Will redirect via useEffect
  }

  return <AuthPage />;
};

export default Login;

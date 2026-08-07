import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LoginPage as LoginPageView } from '../../shell/components';
import { useAuth } from '../../lib/auth';
import { ApiError } from '../../api/client';
import { ROLE_HOME } from '../../shared/accessControl';

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated && user) {
    const from = (location.state as { from?: string })?.from;
    return <Navigate to={from ?? ROLE_HOME[user.activeRole]} replace />;
  }

  async function handleLogin({ email, password }: { email: string; password: string }) {
    setError(null);
    try {
      await login(email, password);
      const from = (location.state as { from?: string })?.from;
      navigate(from ?? '/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  }

  return <LoginPageView productName="Checker" onLogin={handleLogin} error={error} />;
}

import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ROLE_HOME } from '../shared/accessControl';

export default function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return null;
  return <Navigate to={ROLE_HOME[user.activeRole]} replace />;
}

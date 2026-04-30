import useAuth from '../../contexts/useAuth';

export default function ProtectedRoute({ children, requiredRole, fallback = null }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-200">
        Carregando sessão segura...
      </div>
    );
  }

  if (!user) return fallback;
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') return fallback;

  return children;
}

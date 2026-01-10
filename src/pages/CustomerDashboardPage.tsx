import { useAuth } from '@/hooks/useAuth';
import { CustomerDashboard } from '@/components/CustomerDashboard';
import { Navigate } from 'react-router-dom';

export default function CustomerDashboardPage() {
  const { user, profile, signOut, isLoading } = useAuth();

  // Redirect if not authenticated or not a customer
  if (!isLoading && (!user || !profile)) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4 animate-pulse">
            <span className="text-2xl">🚕</span>
          </div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return <CustomerDashboard onBack={() => signOut()} />;
}
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/auth/AuthForm';
import { LoadingScreen } from '@/components/LoadingScreen';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const { profile, isLoading, language } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserRole = async () => {
      if (profile) {
        if (profile.is_admin) {
          navigate('/admin');
        } else if (profile.role === 'driver') {
          // User registered as driver, go to driver dashboard
          navigate('/dashboard/driver');
        } else {
          // Default to customer dashboard
          navigate('/dashboard/customer');
        }
      }
    };
    
    checkUserRole();
  }, [profile, navigate]);

  if (isLoading || profile) {
    return <LoadingScreen />;
  }

  return <AuthForm language={language} />;
};

export default Index;

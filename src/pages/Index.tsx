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
        } else {
          // Check user_roles table to determine if driver or customer
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.user_id)
            .maybeSingle();
          
          if (roleData && roleData.role === 'driver') {
            navigate('/dashboard/driver');
          } else {
            navigate('/dashboard/customer');
          }
        }
      }
    };
    
    checkUserRole();
  }, [profile, navigate]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (profile) {
    return null; // Will redirect via useEffect
  }

  return <AuthForm language={language} />;
};

export default Index;

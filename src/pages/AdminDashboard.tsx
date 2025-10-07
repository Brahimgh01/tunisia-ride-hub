import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { AdminDrivers } from '@/components/admin/AdminDrivers';
import { AdminRides } from '@/components/admin/AdminRides';
import { AdminStats } from '@/components/admin/AdminStats';
import { AdminSurgePricing } from '@/components/admin/AdminSurgePricing';
import { AdminPromoCodes } from '@/components/admin/AdminPromoCodes';
import { Shield, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        navigate('/');
        return;
      }

      // Use security definer function for server-side admin verification
      const { data, error } = await supabase.rpc('verify_admin', { 
        _user_id: user.id 
      });

      if (error || !data) {
        toast({
          title: 'Access Denied',
          description: 'You do not have admin privileges',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    };

    checkAdmin();
  }, [user, navigate, toast]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">TuniRide Management</p>
            </div>
          </div>
          <Button onClick={handleSignOut} variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <AdminStats />

        <Tabs defaultValue="rides" className="mt-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="rides">Rides</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="drivers">Drivers</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="promos">Promo Codes</TabsTrigger>
          </TabsList>

          <TabsContent value="rides" className="mt-6">
            <AdminRides />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <AdminUsers />
          </TabsContent>

          <TabsContent value="drivers" className="mt-6">
            <AdminDrivers />
          </TabsContent>

          <TabsContent value="pricing" className="mt-6">
            <AdminSurgePricing />
          </TabsContent>

          <TabsContent value="promos" className="mt-6">
            <AdminPromoCodes />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

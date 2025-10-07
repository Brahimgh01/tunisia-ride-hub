import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Car, MapPin, TrendingUp, DollarSign } from 'lucide-react';

export function AdminStats() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDrivers: 0,
    totalRides: 0,
    completedRides: 0,
    totalRevenue: 0,
    todayRides: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [usersRes, driversRes, ridesRes, completedRes, todayRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'driver'),
      supabase.from('rides').select('id', { count: 'exact', head: true }),
      supabase.from('rides').select('final_price').eq('status', 'completed'),
      supabase.from('rides').select('id', { count: 'exact', head: true })
        .gte('created_at', new Date().toISOString().split('T')[0]),
    ]);

    const revenue = completedRes.data?.reduce((sum, ride) => sum + (Number(ride.final_price) || 0), 0) || 0;

    setStats({
      totalUsers: usersRes.count || 0,
      totalDrivers: driversRes.count || 0,
      totalRides: ridesRes.count || 0,
      completedRides: completedRes.data?.length || 0,
      totalRevenue: revenue,
      todayRides: todayRes.count || 0,
    });
  };

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-500' },
    { title: 'Active Drivers', value: stats.totalDrivers, icon: Car, color: 'text-green-500' },
    { title: 'Total Rides', value: stats.totalRides, icon: MapPin, color: 'text-purple-500' },
    { title: 'Completed', value: stats.completedRides, icon: TrendingUp, color: 'text-orange-500' },
    { title: 'Revenue', value: `${stats.totalRevenue.toFixed(2)} TND`, icon: DollarSign, color: 'text-emerald-500' },
    { title: 'Today\'s Rides', value: stats.todayRides, icon: MapPin, color: 'text-pink-500' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-5 w-5 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

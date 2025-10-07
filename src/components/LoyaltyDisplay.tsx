import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Award, Star } from 'lucide-react';
import { Language } from '@/hooks/useAuth';

interface LoyaltyDisplayProps {
  language: Language;
}

const translations = {
  en: {
    title: 'Loyalty Points',
    currentPoints: 'Current Points',
    totalEarned: 'Total Earned',
    totalRedeemed: 'Total Redeemed',
    noPoints: 'Start riding to earn points!',
  },
  fr: {
    title: 'Points de fidélité',
    currentPoints: 'Points actuels',
    totalEarned: 'Total gagné',
    totalRedeemed: 'Total utilisé',
    noPoints: 'Commencez à rouler pour gagner des points!',
  },
  ar: {
    title: 'نقاط الولاء',
    currentPoints: 'النقاط الحالية',
    totalEarned: 'المجموع المكتسب',
    totalRedeemed: 'المجموع المستخدم',
    noPoints: 'ابدأ الرحلات لكسب النقاط!',
  }
};

export function LoyaltyDisplay({ language }: LoyaltyDisplayProps) {
  const { user } = useAuth();
  const [points, setPoints] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const t = translations[language];

  useEffect(() => {
    loadPoints();
  }, [user]);

  const loadPoints = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('loyalty_points')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading loyalty points:', error);
      } else if (data) {
        setPoints(data);
      }
    } catch (error) {
      console.error('Error loading loyalty points:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  return (
    <Card className="shadow-tunisian border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          {t.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {points ? (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
              <p className="text-2xl font-bold">{points.points}</p>
              <p className="text-xs text-muted-foreground">{t.currentPoints}</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Award className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-2xl font-bold">{points.total_earned}</p>
              <p className="text-xs text-muted-foreground">{t.totalEarned}</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Trophy className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-2xl font-bold">{points.total_redeemed}</p>
              <p className="text-xs text-muted-foreground">{t.totalRedeemed}</p>
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">{t.noPoints}</p>
        )}
      </CardContent>
    </Card>
  );
}
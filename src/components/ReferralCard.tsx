import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gift, Copy, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReferralCardProps {
  language: string;
}

export function ReferralCard({ language }: ReferralCardProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState('');
  const [referralCount, setReferralCount] = useState(0);

  const translations = {
    en: {
      title: 'Invite Friends',
      description: 'Share your code and earn 100 points per referral',
      yourCode: 'Your Referral Code',
      copy: 'Copy Code',
      copied: 'Copied!',
      referrals: 'Total Referrals',
    },
    ar: {
      title: 'دعوة الأصدقاء',
      description: 'شارك الرمز واكسب 100 نقطة لكل إحالة',
      yourCode: 'رمز الإحالة',
      copy: 'نسخ الرمز',
      copied: 'تم النسخ!',
      referrals: 'إجمالي الإحالات',
    },
    fr: {
      title: 'Inviter des amis',
      description: 'Partagez votre code et gagnez 100 points par parrainage',
      yourCode: 'Votre code de parrainage',
      copy: 'Copier le code',
      copied: 'Copié!',
      referrals: 'Total des parrainages',
    },
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  useEffect(() => {
    if (profile) {
      if (profile.referral_code) {
        setReferralCode(profile.referral_code);
        fetchReferralCount();
      } else if (user) {
        // Generate a new referral code if missing
        const code = (user.id.slice(0, 8) + Math.random().toString(36).slice(2, 7)).toUpperCase();
        setReferralCode(code);
        // Save to profile in Supabase
        supabase.from('profiles').update({ referral_code: code }).eq('user_id', user.id);
      }
    }
  }, [profile, user]);

  const fetchReferralCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', user.id);
    setReferralCount(count || 0);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast({ title: t.copied });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          {t.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t.description}</p>
        <div className="flex gap-2">
          <Input value={referralCode} readOnly className="font-mono text-lg" />
          <Button onClick={copyCode} variant="outline">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-medium">{t.referrals}</span>
          </div>
          <span className="text-2xl font-bold">{referralCount}</span>
        </div>
      </CardContent>
    </Card>
  );
}

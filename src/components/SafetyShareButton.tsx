import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Share2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface SafetyShareButtonProps {
  rideId: string;
  language: string;
}

export function SafetyShareButton({ rideId, language }: SafetyShareButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [shareLink, setShareLink] = useState('');

  const translations = {
    en: {
      shareTrip: 'Share Trip',
      safetyFirst: 'Safety First',
      contactName: 'Contact Name',
      contactPhone: 'Contact Phone',
      generate: 'Generate Share Link',
      copy: 'Copy Link',
      copied: 'Link copied!',
    },
    ar: {
      shareTrip: 'مشاركة الرحلة',
      safetyFirst: 'السلامة أولاً',
      contactName: 'اسم جهة الاتصال',
      contactPhone: 'رقم الهاتف',
      generate: 'إنشاء رابط المشاركة',
      copy: 'نسخ الرابط',
      copied: 'تم النسخ!',
    },
    fr: {
      shareTrip: 'Partager le trajet',
      safetyFirst: 'Sécurité d\'abord',
      contactName: 'Nom du contact',
      contactPhone: 'Téléphone',
      generate: 'Générer le lien',
      copy: 'Copier le lien',
      copied: 'Lien copié!',
    },
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  const generateShareLink = async () => {
    if (!user) return;

    const token = Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { error } = await supabase.from('trip_shares').insert({
      ride_id: rideId,
      customer_id: user.id,
      share_token: token,
      shared_with_name: contactName,
      shared_with_phone: contactPhone,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    const link = `${window.location.origin}/track/${token}`;
    setShareLink(link);
    toast({ title: 'Success', description: 'Share link generated' });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast({ title: t.copied });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Shield className="h-4 w-4 mr-2" />
          {t.shareTrip}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t.safetyFirst}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t.contactName}</Label>
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
          <div>
            <Label>{t.contactPhone}</Label>
            <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </div>
          {!shareLink ? (
            <Button onClick={generateShareLink} className="w-full">
              <Share2 className="h-4 w-4 mr-2" />
              {t.generate}
            </Button>
          ) : (
            <div className="space-y-2">
              <Input value={shareLink} readOnly />
              <Button onClick={copyLink} className="w-full">
                <Copy className="h-4 w-4 mr-2" />
                {t.copy}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

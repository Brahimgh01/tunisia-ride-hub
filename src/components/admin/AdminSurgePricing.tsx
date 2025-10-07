import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

interface SurgePricing {
  id: string;
  city: string;
  multiplier: number;
  is_active: boolean;
}

export function AdminSurgePricing() {
  const [pricingRules, setPricingRules] = useState<SurgePricing[]>([]);
  const [newCity, setNewCity] = useState('');
  const [newMultiplier, setNewMultiplier] = useState('1.5');
  const { toast } = useToast();

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    const { data } = await supabase
      .from('surge_pricing')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setPricingRules(data);
  };

  const addSurgePricing = async () => {
    const { error } = await supabase.from('surge_pricing').insert({
      city: newCity,
      multiplier: parseFloat(newMultiplier),
      is_active: true,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Surge pricing added' });
      setNewCity('');
      setNewMultiplier('1.5');
      fetchPricing();
    }
  };

  const toggleSurge = async (id: string, isActive: boolean) => {
    await supabase.from('surge_pricing').update({ is_active: !isActive }).eq('id', id);
    fetchPricing();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Surge Pricing Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>City</Label>
            <Input value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="Tunis" />
          </div>
          <div>
            <Label>Multiplier</Label>
            <Input
              type="number"
              step="0.1"
              value={newMultiplier}
              onChange={(e) => setNewMultiplier(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={addSurgePricing} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Surge
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {pricingRules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-semibold">{rule.city}</div>
                <div className="text-sm text-muted-foreground">{rule.multiplier}x multiplier</div>
              </div>
              <Switch checked={rule.is_active} onCheckedChange={() => toggleSurge(rule.id, rule.is_active)} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PromoCode {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
}

export function AdminPromoCodes() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [newCode, setNewCode] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('10');
  const [maxUses, setMaxUses] = useState('100');
  const { toast } = useToast();

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    const { data } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setPromoCodes(data);
  };

  const addPromoCode = async () => {
    const { error } = await supabase.from('promo_codes').insert({
      code: newCode.toUpperCase(),
      discount_type: discountType,
      discount_value: parseFloat(discountValue),
      max_uses: parseInt(maxUses),
      is_active: true,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Promo code created' });
      setNewCode('');
      fetchPromoCodes();
    }
  };

  const deletePromo = async (id: string) => {
    await supabase.from('promo_codes').delete().eq('id', id);
    toast({ title: 'Deleted', description: 'Promo code removed' });
    fetchPromoCodes();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Promo Codes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <Label>Code</Label>
            <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="SAVE20" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={discountType} onValueChange={setDiscountType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="fixed">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Value</Label>
            <Input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
            />
          </div>
          <div>
            <Label>Max Uses</Label>
            <Input
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={addPromoCode} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Create Promo Code
        </Button>

        <div className="space-y-2">
          {promoCodes.map((promo) => (
            <div key={promo.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="font-mono">{promo.code}</Badge>
                <span>
                  {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `${promo.discount_value} TND`} off
                </span>
                <span className="text-sm text-muted-foreground">
                  {promo.current_uses}/{promo.max_uses} used
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deletePromo(promo.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

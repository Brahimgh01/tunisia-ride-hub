import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Heart, Home, Briefcase, MapPin, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Language } from '@/hooks/useAuth';

interface FavoriteLocationsProps {
  language: Language;
}

const translations = {
  en: {
    title: 'Favorite Locations',
    addNew: 'Add New Location',
    name: 'Location Name',
    address: 'Address',
    type: 'Type',
    home: 'Home',
    work: 'Work',
    other: 'Other',
    save: 'Save',
    delete: 'Delete',
    success: 'Location saved!',
    deleteSuccess: 'Location deleted!',
    error: 'Failed to save location',
  },
  fr: {
    title: 'Lieux favoris',
    addNew: 'Ajouter un lieu',
    name: 'Nom du lieu',
    address: 'Adresse',
    type: 'Type',
    home: 'Domicile',
    work: 'Travail',
    other: 'Autre',
    save: 'Enregistrer',
    delete: 'Supprimer',
    success: 'Lieu enregistré!',
    deleteSuccess: 'Lieu supprimé!',
    error: 'Échec de l\'enregistrement',
  },
  ar: {
    title: 'الأماكن المفضلة',
    addNew: 'إضافة مكان',
    name: 'اسم المكان',
    address: 'العنوان',
    type: 'النوع',
    home: 'المنزل',
    work: 'العمل',
    other: 'آخر',
    save: 'حفظ',
    delete: 'حذف',
    success: 'تم حفظ المكان!',
    deleteSuccess: 'تم حذف المكان!',
    error: 'فشل الحفظ',
  }
};

export function FavoriteLocations({ language }: FavoriteLocationsProps) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    locationType: 'other'
  });

  const t = translations[language];

  useEffect(() => {
    loadFavorites();
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('favorite_locations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setFavorites(data);
  };

  const handleSave = async () => {
    if (!user || !formData.name || !formData.address) return;

    setLoading(true);
    try {
      // Mock coordinates for now
      const mockCoords = {
        latitude: 36.8065 + Math.random() * 0.1,
        longitude: 10.1815 + Math.random() * 0.1
      };

      const { error } = await supabase.from('favorite_locations').insert({
        user_id: user.id,
        name: formData.name,
        address: formData.address,
        location_type: formData.locationType,
        latitude: mockCoords.latitude,
        longitude: mockCoords.longitude
      });

      if (error) throw error;

      toast.success(t.success);
      setFormData({ name: '', address: '', locationType: 'other' });
      setIsOpen(false);
      loadFavorites();
    } catch (error) {
      console.error('Error saving favorite:', error);
      toast.error(t.error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('favorite_locations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success(t.deleteSuccess);
      loadFavorites();
    } catch (error) {
      console.error('Error deleting favorite:', error);
      toast.error(t.error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'home': return <Home className="h-5 w-5" />;
      case 'work': return <Briefcase className="h-5 w-5" />;
      default: return <MapPin className="h-5 w-5" />;
    }
  };

  return (
    <Card className="shadow-tunisian">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            {t.title}
          </CardTitle>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                {t.addNew}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.addNew}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t.name}</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t.name}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.address}</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder={t.address}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.type}</Label>
                  <Select
                    value={formData.locationType}
                    onValueChange={(value) => setFormData({ ...formData, locationType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">{t.home}</SelectItem>
                      <SelectItem value="work">{t.work}</SelectItem>
                      <SelectItem value="other">{t.other}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSave} disabled={loading} className="w-full">
                  {loading ? '...' : t.save}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {favorites.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">{t.addNew}</p>
          ) : (
            favorites.map((fav) => (
              <div
                key={fav.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getIcon(fav.location_type)}
                  <div>
                    <p className="font-medium">{fav.name}</p>
                    <p className="text-sm text-muted-foreground">{fav.address}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(fav.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star, ThumbsUp, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface RatingFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rideId: string;
  language: string;
}

export function RatingFeedbackDialog({ open, onOpenChange, rideId, language }: RatingFeedbackDialogProps) {
  const { toast } = useToast();
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [feedbackType, setFeedbackType] = useState<'positive' | 'complaint'>('positive');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const translations = {
    en: {
      title: 'Rate Your Ride',
      description: 'How was your experience?',
      ratingLabel: 'Rate the driver',
      feedbackTypeLabel: 'Feedback Type',
      positive: 'Positive Feedback',
      complaint: 'Report Issue / Complaint',
      feedbackPlaceholder: 'Share your experience or report any issues...',
      submit: 'Submit',
      skip: 'Skip',
      ratingRequired: 'Please select a rating',
      success: 'Thank you for your feedback!',
      error: 'Failed to submit feedback',
    },
    ar: {
      title: 'قيّم رحلتك',
      description: 'كيف كانت تجربتك؟',
      ratingLabel: 'قيّم السائق',
      feedbackTypeLabel: 'نوع الملاحظة',
      positive: 'ملاحظة إيجابية',
      complaint: 'الإبلاغ عن مشكلة / شكوى',
      feedbackPlaceholder: 'شارك تجربتك أو أبلغ عن أي مشاكل...',
      submit: 'إرسال',
      skip: 'تخطي',
      ratingRequired: 'يرجى اختيار تقييم',
      success: 'شكراً لملاحظاتك!',
      error: 'فشل إرسال الملاحظة',
    },
    fr: {
      title: 'Évaluez votre course',
      description: 'Comment était votre expérience?',
      ratingLabel: 'Évaluer le chauffeur',
      feedbackTypeLabel: 'Type de commentaire',
      positive: 'Commentaire positif',
      complaint: 'Signaler un problème / Plainte',
      feedbackPlaceholder: 'Partagez votre expérience ou signalez des problèmes...',
      submit: 'Soumettre',
      skip: 'Passer',
      ratingRequired: 'Veuillez sélectionner une note',
      success: 'Merci pour vos commentaires!',
      error: 'Échec de soumission des commentaires',
    }
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: t.ratingRequired,
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // First get the ride to find driver_id and user_id
      const { data: rideData, error: rideError } = await supabase
        .from('rides')
        .select('driver_id, customer_id')
        .eq('id', rideId)
        .single();

      if (rideError || !rideData?.driver_id) {
        throw new Error('Could not find ride or driver');
      }

      // Update the ride with rating
      const updates: any = {
        driver_rating: rating,
      };

      if (feedback.trim()) {
        updates.customer_notes = `[${feedbackType}] ${feedback}`;
      }

      const { error: updateError } = await supabase
        .from('rides')
        .update(updates)
        .eq('id', rideId);

      if (updateError) throw updateError;

      // Insert into ride_ratings table for driver's rating history
      const { error: ratingError } = await supabase
        .from('ride_ratings')
        .insert({
          ride_id: rideId,
          driver_id: rideData.driver_id,
          user_id: rideData.customer_id,
          rating: rating,
          comment: feedback.trim() || null,
        });

      if (ratingError) {
        console.error('Error saving to ride_ratings:', ratingError);
        // Don't fail the whole operation if this fails
      }

      toast({
        title: t.success,
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Rating submission error:', error);
      toast({
        title: t.error,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label>{t.ratingLabel}</Label>
            <div className="flex gap-2 justify-center py-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-10 w-10 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Feedback Type */}
          <div className="space-y-3">
            <Label>{t.feedbackTypeLabel}</Label>
            <RadioGroup value={feedbackType} onValueChange={(value) => setFeedbackType(value as 'positive' | 'complaint')}>
              <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                <RadioGroupItem value="positive" id="positive" />
                <Label htmlFor="positive" className="flex items-center gap-2 cursor-pointer flex-1">
                  <ThumbsUp className="h-4 w-4 text-green-600" />
                  {t.positive}
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                <RadioGroupItem value="complaint" id="complaint" />
                <Label htmlFor="complaint" className="flex items-center gap-2 cursor-pointer flex-1">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  {t.complaint}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Feedback Text */}
          <div className="space-y-2">
            <Textarea
              placeholder={t.feedbackPlaceholder}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              className={feedbackType === 'complaint' ? 'border-red-300' : ''}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleSkip} disabled={submitting}>
            {t.skip}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? '...' : t.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

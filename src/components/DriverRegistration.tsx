import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, Check, Camera, Car, CreditCard, FileText, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Language } from '@/lib/types';

const translations = {
  en: {
    vehicleInfo: 'Vehicle Information',
    identityVerification: 'Identity Verification',
    driverDocuments: 'Driver Documents',
    reviewSubmit: 'Review & Submit',
    tellUsAboutVehicle: 'Tell us about your vehicle',
    uploadNationalId: 'Upload your national ID card (both sides)',
    uploadLicenseReg: 'Upload your license and vehicle registration',
    reviewAndSubmit: 'Review your information and submit',
    vehicleType: 'Vehicle Type',
    selectVehicleType: 'Select vehicle type',
    taxi: 'Taxi',
    premiumCar: 'Premium Car',
    carpoolingCar: 'Carpooling Car',
    motorcycle: 'Motorcycle',
    vehicleModel: 'Vehicle Model',
    vehicleModelPlaceholder: 'e.g., Toyota Camry 2020',
    vehicleColor: 'Vehicle Color',
    vehicleColorPlaceholder: 'e.g., Black',
    licensePlate: 'License Plate Number',
    licensePlatePlaceholder: 'e.g., 123-TUN-456',
    nationalIdFront: 'National ID (Front)',
    nationalIdBack: 'National ID (Back)',
    clickToUploadFront: 'Click to upload front side',
    clickToUploadBack: 'Click to upload back side',
    drivingLicense: 'Driving License',
    uploadLicensePhoto: 'Upload clear photo or PDF of your driving license',
    vehicleRegistration: 'Vehicle Registration (Carte Grise)',
    uploadVehicleReg: 'Upload vehicle registration document',
    carPhoto: 'Car Photo',
    uploadCarPhoto: 'Upload a clear photo of your car',
    next: 'Next',
    back: 'Back',
    submit: 'Submit Registration',
    completeAllSteps: 'Please complete all steps and upload all required documents.',
    uploadingDocs: 'Uploading documents...',
    creatingProfile: 'Creating driver profile...',
    registrationComplete: 'Registration complete! You have 1 month free trial. You can now accept rides!',
    stepVehicleInfo: 'Vehicle Info',
    stepIdDocuments: 'ID Documents',
    stepLicenseReg: 'License & Registration',
    stepReview: 'Review',
    stepSubscription: 'Subscription',
    reviewYourInfo: 'Review your information before submitting',
    yourVehicle: 'Your Vehicle',
    uploadedDocuments: 'Uploaded Documents',
    idCardUploaded: 'ID Card (Front & Back)',
    drivingLicenseUploaded: 'Driving License',
    vehicleRegUploaded: 'Vehicle Registration',
    carPhotoUploaded: 'Car Photo',
    subscriptionInfo: 'Subscription Information',
    freeTrialTitle: '1 Month Free Trial',
    freeTrialDesc: 'Start accepting rides immediately with no fees for your first month',
    afterTrial: 'After trial: 50 TND/month',
    submitting: 'Submitting...',
  },
  fr: {
    vehicleInfo: 'Informations sur le véhicule',
    identityVerification: 'Vérification d\'identité',
    driverDocuments: 'Documents du chauffeur',
    reviewSubmit: 'Réviser et soumettre',
    tellUsAboutVehicle: 'Parlez-nous de votre véhicule',
    uploadNationalId: 'Téléchargez votre carte d\'identité nationale (recto verso)',
    uploadLicenseReg: 'Téléchargez votre permis et carte grise',
    reviewAndSubmit: 'Vérifiez vos informations et soumettez',
    vehicleType: 'Type de véhicule',
    selectVehicleType: 'Sélectionnez le type de véhicule',
    taxi: 'Taxi',
    premiumCar: 'Voiture Premium',
    carpoolingCar: 'Voiture de covoiturage',
    motorcycle: 'Moto',
    vehicleModel: 'Modèle du véhicule',
    vehicleModelPlaceholder: 'ex: Toyota Camry 2020',
    vehicleColor: 'Couleur du véhicule',
    vehicleColorPlaceholder: 'ex: Noir',
    licensePlate: 'Numéro de plaque',
    licensePlatePlaceholder: 'ex: 123-TUN-456',
    nationalIdFront: 'Carte d\'identité (Recto)',
    nationalIdBack: 'Carte d\'identité (Verso)',
    clickToUploadFront: 'Cliquez pour télécharger le recto',
    clickToUploadBack: 'Cliquez pour télécharger le verso',
    drivingLicense: 'Permis de conduire',
    uploadLicensePhoto: 'Téléchargez une photo claire ou PDF de votre permis',
    vehicleRegistration: 'Carte Grise',
    uploadVehicleReg: 'Téléchargez le document de carte grise',
    carPhoto: 'Photo du véhicule',
    uploadCarPhoto: 'Téléchargez une photo claire de votre véhicule',
    next: 'Suivant',
    back: 'Retour',
    submit: 'Soumettre l\'inscription',
    completeAllSteps: 'Veuillez compléter toutes les étapes et télécharger tous les documents requis.',
    uploadingDocs: 'Téléchargement des documents...',
    creatingProfile: 'Création du profil chauffeur...',
    registrationComplete: 'Inscription terminée! Vous avez 1 mois d\'essai gratuit. Vous pouvez maintenant accepter des courses!',
    stepVehicleInfo: 'Véhicule',
    stepIdDocuments: 'Documents ID',
    stepLicenseReg: 'Permis & Carte Grise',
    stepReview: 'Révision',
    stepSubscription: 'Abonnement',
    reviewYourInfo: 'Vérifiez vos informations avant de soumettre',
    yourVehicle: 'Votre véhicule',
    uploadedDocuments: 'Documents téléchargés',
    idCardUploaded: 'Carte d\'identité (Recto & Verso)',
    drivingLicenseUploaded: 'Permis de conduire',
    vehicleRegUploaded: 'Carte Grise',
    carPhotoUploaded: 'Photo du véhicule',
    subscriptionInfo: 'Informations d\'abonnement',
    freeTrialTitle: '1 Mois d\'essai gratuit',
    freeTrialDesc: 'Commencez à accepter des courses immédiatement sans frais pendant votre premier mois',
    afterTrial: 'Après l\'essai: 50 TND/mois',
    submitting: 'Soumission...',
  },
  ar: {
    vehicleInfo: 'معلومات المركبة',
    identityVerification: 'التحقق من الهوية',
    driverDocuments: 'وثائق السائق',
    reviewSubmit: 'مراجعة وإرسال',
    tellUsAboutVehicle: 'أخبرنا عن مركبتك',
    uploadNationalId: 'قم بتحميل بطاقة الهوية الوطنية (الوجهين)',
    uploadLicenseReg: 'قم بتحميل رخصة القيادة والبطاقة الرمادية',
    reviewAndSubmit: 'راجع معلوماتك وأرسل',
    vehicleType: 'نوع المركبة',
    selectVehicleType: 'اختر نوع المركبة',
    taxi: 'تاكسي',
    premiumCar: 'سيارة فاخرة',
    carpoolingCar: 'سيارة مشاركة',
    motorcycle: 'دراجة نارية',
    vehicleModel: 'طراز المركبة',
    vehicleModelPlaceholder: 'مثال: Toyota Camry 2020',
    vehicleColor: 'لون المركبة',
    vehicleColorPlaceholder: 'مثال: أسود',
    licensePlate: 'رقم لوحة الترخيص',
    licensePlatePlaceholder: 'مثال: 123-TUN-456',
    nationalIdFront: 'بطاقة الهوية (الأمام)',
    nationalIdBack: 'بطاقة الهوية (الخلف)',
    clickToUploadFront: 'انقر لتحميل الوجه الأمامي',
    clickToUploadBack: 'انقر لتحميل الوجه الخلفي',
    drivingLicense: 'رخصة القيادة',
    uploadLicensePhoto: 'قم بتحميل صورة واضحة أو PDF لرخصة القيادة',
    vehicleRegistration: 'البطاقة الرمادية',
    uploadVehicleReg: 'قم بتحميل وثيقة البطاقة الرمادية',
    carPhoto: 'صورة السيارة',
    uploadCarPhoto: 'قم بتحميل صورة واضحة لسيارتك',
    next: 'التالي',
    back: 'رجوع',
    submit: 'إرسال التسجيل',
    completeAllSteps: 'يرجى إكمال جميع الخطوات وتحميل جميع المستندات المطلوبة.',
    uploadingDocs: 'جاري تحميل المستندات...',
    creatingProfile: 'جاري إنشاء ملف السائق...',
    registrationComplete: 'اكتمل التسجيل! لديك شهر واحد تجريبي مجاني. يمكنك الآن قبول الرحلات!',
    stepVehicleInfo: 'المركبة',
    stepIdDocuments: 'الهوية',
    stepLicenseReg: 'الرخصة والبطاقة',
    stepReview: 'مراجعة',
    stepSubscription: 'الاشتراك',
    reviewYourInfo: 'راجع معلوماتك قبل الإرسال',
    yourVehicle: 'مركبتك',
    uploadedDocuments: 'المستندات المحملة',
    idCardUploaded: 'بطاقة الهوية (الوجهين)',
    drivingLicenseUploaded: 'رخصة القيادة',
    vehicleRegUploaded: 'البطاقة الرمادية',
    carPhotoUploaded: 'صورة السيارة',
    subscriptionInfo: 'معلومات الاشتراك',
    freeTrialTitle: 'شهر واحد تجريبي مجاني',
    freeTrialDesc: 'ابدأ بقبول الرحلات فوراً بدون رسوم خلال شهرك الأول',
    afterTrial: 'بعد التجربة: 50 دينار/شهر',
    submitting: 'جاري الإرسال...',
  },
};

interface DriverRegistrationProps {
  onRegistrationComplete: () => void;
}

export default function DriverRegistration({ onRegistrationComplete }: DriverRegistrationProps) {
  const { user, language } = useAuth();
  const t = translations[language] || translations.en;
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 5;
  
  // Vehicle details
  const [vehicleType, setVehicleType] = useState<string>('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  
  // Document uploads
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [vehicleRegFile, setVehicleRegFile] = useState<File | null>(null);
  const [carPhotoFile, setCarPhotoFile] = useState<File | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: (file: File | null) => void) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    } else {
      setFile(null);
    }
  };

  const uploadDocument = async (file: File, path: string): Promise<string | null> => {
    if (!user) return null;

    const { data, error } = await supabase.storage
      .from('driver_documents')
      .upload(`${user.id}/${path}`, file, {
        cacheControl: '3600',
        upsert: true,
      });
      
    if (error) {
      toast.error(`Failed to upload ${path}`);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('driver_documents')
      .getPublicUrl(`${user.id}/${path}`);
      
    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!user || !idFrontFile || !idBackFile || !licenseFile || !vehicleRegFile || !carPhotoFile || !vehicleType) {
      toast.error(t.completeAllSteps);
      return;
    }

    setLoading(true);
    
    toast.loading(t.uploadingDocs);
    
    // Upload all documents
    const [idFrontUrl, idBackUrl, licenseUrl, vehicleRegUrl, carPhotoUrl] = await Promise.all([
      uploadDocument(idFrontFile, 'id_front.jpg'),
      uploadDocument(idBackFile, 'id_back.jpg'),
      uploadDocument(licenseFile, 'license.jpg'),
      uploadDocument(vehicleRegFile, 'vehicle_registration.jpg'),
      uploadDocument(carPhotoFile, 'car_photo.jpg'),
    ]);

    if (!idFrontUrl || !idBackUrl || !licenseUrl || !vehicleRegUrl || !carPhotoUrl) {
      setLoading(false);
      toast.dismiss();
      return;
    }

    toast.dismiss();
    toast.loading(t.creatingProfile);

    // Upsert driver profile (insert or update if exists)
    const { error: profileError } = await supabase
      .from('driver_profiles')
      .upsert({
        driver_id: user.id,
        vehicle_type: vehicleType,
        vehicle_model: vehicleModel,
        vehicle_color: vehicleColor,
        license_plate_number: licensePlate,
        id_document_front_url: idFrontUrl,
        id_document_back_url: idBackUrl,
        license_document_url: licenseUrl,
        vehicle_registration_document_url: vehicleRegUrl,
        is_verified: false,
        is_available: false,
      }, { onConflict: 'driver_id' })
      .select();

    if (profileError) {
      toast.dismiss();
      console.error('Error creating driver profile:', profileError);
      toast.error(profileError.message || 'Failed to create driver profile.');
      setLoading(false);
      return;
    }

    toast.dismiss();

    // Create subscription with 1-month free trial
    const trialStartDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setMonth(trialEndDate.getMonth() + 1);

    // Upsert driver subscription (insert or update if exists)
    const { error: subscriptionError } = await supabase
      .from('driver_subscriptions')
      .upsert({
        driver_id: user.id,
        license_number: licensePlate || '',
        car_number: licensePlate || '',
        vehicle_type: vehicleType || '',
        vehicle_model: vehicleModel || '',
        vehicle_color: vehicleColor || '',
        status: 'active',
        is_trial: true,
        trial_start_date: trialStartDate.toISOString(),
        trial_end_date: trialEndDate.toISOString(),
        subscription_start_date: trialStartDate.toISOString(),
        subscription_end_date: trialEndDate.toISOString(),
        subscription_type: 'monthly',
        monthly_fee: 50.00
      }, {
        onConflict: 'driver_id'
      })
      .select();

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError);
      toast.error(subscriptionError.message || 'Failed to create subscription. Please try again.');
      setLoading(false);
      return;
    }

    // Auto-verify driver (no admin approval needed)
    const { error: verifyError } = await supabase
      .from('driver_profiles')
      .update({ 
        is_verified: true,
        is_available: false,
        id_verification_status: 'approved'
      })
      .eq('driver_id', user.id);
    
    if (verifyError) {
      console.error('Error verifying driver:', verifyError);
    }

    toast.success('✅ ' + t.registrationComplete);
    setLoading(false);
    onRegistrationComplete();
  };

  const canProceedToStep2 = vehicleType && vehicleModel && vehicleColor && licensePlate;
  const canProceedToStep3 = idFrontFile && idBackFile && licenseFile;
  const canSubmit = vehicleRegFile && carPhotoFile;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-6">
      <div className="max-w-4xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {step > s ? <Check className="h-5 w-5" /> : s}
                </div>
                {s < 5 && <div className={`h-1 w-16 mx-2 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{t.stepVehicleInfo}</span>
            <span>{t.stepIdDocuments}</span>
            <span>{t.stepLicenseReg}</span>
            <span>{t.stepReview}</span>
            <span>{t.stepSubscription}</span>
          </div>
        </div>

        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-2">
              {step === 1 && <><Car className="h-7 w-7" /> {t.vehicleInfo}</>}
              {step === 2 && <><Shield className="h-7 w-7" /> {t.identityVerification}</>}
              {step === 3 && <><FileText className="h-7 w-7" /> {t.driverDocuments}</>}
              {step === 4 && <><Check className="h-7 w-7" /> {t.reviewSubmit}</>}
            </CardTitle>
            <CardDescription>
              {step === 1 && t.tellUsAboutVehicle}
              {step === 2 && t.uploadNationalId}
              {step === 3 && t.uploadLicenseReg}
              {step === 4 && t.reviewAndSubmit}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Step 1: Vehicle Information */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-type">{t.vehicleType} *</Label>
                    <Select onValueChange={setVehicleType} value={vehicleType} required>
                      <SelectTrigger id="vehicle-type">
                        <SelectValue placeholder={t.selectVehicleType} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="taxi">🚕 {t.taxi}</SelectItem>
                        <SelectItem value="premium">👑 {t.premiumCar}</SelectItem>
                        <SelectItem value="carpooling">👥 {t.carpoolingCar}</SelectItem>
                        <SelectItem value="motorcycle">🏍️ {t.motorcycle}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicleModel">{t.vehicleModel} *</Label>
                    <Input 
                      id="vehicleModel" 
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      placeholder={t.vehicleModelPlaceholder} 
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicleColor">{t.vehicleColor} *</Label>
                    <Input 
                      id="vehicleColor" 
                      value={vehicleColor}
                      onChange={(e) => setVehicleColor(e.target.value)}
                      placeholder={t.vehicleColorPlaceholder} 
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="licensePlate">{t.licensePlate} *</Label>
                    <Input 
                      id="licensePlate" 
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value)}
                      placeholder={t.licensePlatePlaceholder} 
                      required 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: ID Documents */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="id-front" className="flex items-center gap-2">
                      <Camera className="h-4 w-4" /> {t.nationalIdFront} *
                    </Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                      <input
                        id="id-front"
                        type="file"
                        onChange={(e) => handleFileChange(e as any, setIdFrontFile)}
                        accept="image/jpeg,image/png,image/jpg"
                        className="hidden"
                      />
                      <label htmlFor="id-front" className="cursor-pointer">
                        {idFrontFile ? (
                          <div className="flex items-center justify-center gap-2 text-green-600">
                            <Check className="h-5 w-5" />
                            <span className="font-medium">{idFrontFile.name}</span>
                          </div>
                        ) : (
                          <div>
                            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">{t.clickToUploadFront}</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="id-back" className="flex items-center gap-2">
                      <Camera className="h-4 w-4" /> {t.nationalIdBack} *
                    </Label>
                      <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                      <input
                        id="id-back"
                        type="file"
                        onChange={(e) => handleFileChange(e as any, setIdBackFile)}
                        accept="image/jpeg,image/png,image/jpg"
                        className="hidden"
                      />
                      <label htmlFor="id-back" className="cursor-pointer">
                        {idBackFile ? (
                          <div className="flex items-center justify-center gap-2 text-green-600">
                            <Check className="h-5 w-5" />
                            <span className="font-medium">{idBackFile.name}</span>
                          </div>
                        ) : (
                          <div>
                            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">{t.clickToUploadBack}</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="license-doc" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" /> {t.drivingLicense} *
                  </Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                    <input
                      id="license-doc"
                      type="file"
                      onChange={(e) => handleFileChange(e as any, setLicenseFile)}
                      accept="image/jpeg,image/png,image/jpg,application/pdf"
                      className="hidden"
                    />
                    <label htmlFor="license-doc" className="cursor-pointer">
                      {licenseFile ? (
                        <div className="flex items-center justify-center gap-2 text-green-600">
                          <Check className="h-5 w-5" />
                          <span className="font-medium">{licenseFile.name}</span>
                        </div>
                      ) : (
                        <div>
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">{t.uploadLicensePhoto}</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Vehicle Documents */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-reg" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" /> {t.vehicleRegistration} *
                    </Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                      <input
                        id="vehicle-reg"
                        type="file"
                        onChange={(e) => handleFileChange(e as any, setVehicleRegFile)}
                        accept="image/jpeg,image/png,image/jpg,application/pdf"
                        className="hidden"
                      />
                      <label htmlFor="vehicle-reg" className="cursor-pointer">
                        {vehicleRegFile ? (
                          <div className="flex items-center justify-center gap-2 text-green-600">
                            <Check className="h-5 w-5" />
                            <span className="font-medium">{vehicleRegFile.name}</span>
                          </div>
                        ) : (
                          <div>
                            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">{t.uploadVehicleReg}</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="car-photo" className="flex items-center gap-2">
                      <Camera className="h-4 w-4" /> {t.carPhoto} *
                    </Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                      <input
                        id="car-photo"
                        type="file"
                        onChange={(e) => handleFileChange(e as any, setCarPhotoFile)}
                        accept="image/jpeg,image/png,image/jpg"
                        className="hidden"
                      />
                      <label htmlFor="car-photo" className="cursor-pointer">
                        {carPhotoFile ? (
                          <div className="flex items-center justify-center gap-2 text-green-600">
                            <Check className="h-5 w-5" />
                            <span className="font-medium">{carPhotoFile.name}</span>
                          </div>
                        ) : (
                          <div>
                            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">{t.uploadCarPhoto}</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-6">
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Car className="h-5 w-5" /> {t.yourVehicle}
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div><span className="text-muted-foreground">{t.vehicleType}:</span> <Badge>{vehicleType}</Badge></div>
                      <div><span className="text-muted-foreground">{t.vehicleModel}:</span> {vehicleModel}</div>
                      <div><span className="text-muted-foreground">{t.vehicleColor}:</span> {vehicleColor}</div>
                      <div><span className="text-muted-foreground">{t.licensePlate}:</span> {licensePlate}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5" /> {t.uploadedDocuments}
                    </h3>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" /> {t.idCardUploaded}
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" /> {t.drivingLicenseUploaded}
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" /> {t.vehicleRegUploaded}
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" /> {t.carPhotoUploaded}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 5: Subscription & Free Trial */}
            {step === 5 && (
              <div className="space-y-6">
                <Card className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-green-600" /> {t.subscriptionInfo}
                    </h3>
                    <div className="text-lg mb-2">
                      <span className="font-bold text-green-700 dark:text-green-300">{t.freeTrialTitle}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{t.freeTrialDesc}</p>
                    <p className="text-sm text-muted-foreground">{t.afterTrial}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <Separator />

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)} disabled={loading}>
                  {t.back}
                </Button>
              )}
              <div className="ml-auto">
                {step < totalSteps ? (
                  <Button
                    onClick={() => setStep(step + 1)}
                    disabled={
                      (step === 1 && !canProceedToStep2) ||
                      (step === 2 && !canProceedToStep3) ||
                      (step === 3 && !canSubmit)
                    }
                  >
                    {t.next}
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={loading} className="min-w-32">
                    {loading ? t.submitting : t.submit}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

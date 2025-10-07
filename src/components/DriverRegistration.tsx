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

interface DriverRegistrationProps {
  onRegistrationComplete: () => void;
}

export default function DriverRegistration({ onRegistrationComplete }: DriverRegistrationProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
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
      toast.error('Please complete all steps and upload all required documents.');
      return;
    }

    setLoading(true);
    
    toast.loading('Uploading documents...');
    
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
    toast.loading('Creating driver profile...');

    // Create driver profile
    const { error: profileError } = await supabase
      .from('driver_profiles')
      .insert({
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
      })
      .select();

    if (profileError) {
      toast.dismiss();
      console.error('Error creating driver profile:', profileError);
      toast.error(profileError.message || 'Failed to create driver profile.');
      setLoading(false);
      return;
    }

    // Create subscription with 1-month free trial
    const trialStartDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setMonth(trialEndDate.getMonth() + 1);

    const { error: subscriptionError } = await supabase
      .from('driver_subscriptions')
      .insert({
        driver_id: user.id,
        license_number: licensePlate,
        car_number: licensePlate,
        vehicle_type: vehicleType,
        vehicle_model: vehicleModel,
        vehicle_color: vehicleColor,
        status: 'active',
        is_trial: true,
        trial_start_date: trialStartDate.toISOString(),
        trial_end_date: trialEndDate.toISOString(),
        subscription_type: 'monthly',
        monthly_fee: 50.00
      });

    toast.dismiss();
    
    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError);
      toast.error('Profile created but subscription setup failed. Please contact support.');
    } else {
      toast.success('Registration successful! You have 1 month free trial. Access your dashboard now.');
    }

    onRegistrationComplete();
    setLoading(false);
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
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {step > s ? <Check className="h-5 w-5" /> : s}
                </div>
                {s < 4 && <div className={`h-1 w-16 mx-2 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Vehicle Info</span>
            <span>ID Documents</span>
            <span>License & Registration</span>
            <span>Review</span>
          </div>
        </div>

        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-2">
              {step === 1 && <><Car className="h-7 w-7" /> Vehicle Information</>}
              {step === 2 && <><Shield className="h-7 w-7" /> Identity Verification</>}
              {step === 3 && <><FileText className="h-7 w-7" /> Driver Documents</>}
              {step === 4 && <><Check className="h-7 w-7" /> Review & Submit</>}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Tell us about your vehicle'}
              {step === 2 && 'Upload your national ID card (both sides)'}
              {step === 3 && 'Upload your license and vehicle registration'}
              {step === 4 && 'Review your information and submit'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Step 1: Vehicle Information */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-type">Vehicle Type *</Label>
                    <Select onValueChange={setVehicleType} value={vehicleType} required>
                      <SelectTrigger id="vehicle-type">
                        <SelectValue placeholder="Select vehicle type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="taxi">🚕 Taxi</SelectItem>
                        <SelectItem value="premium">👑 Premium Car</SelectItem>
                        <SelectItem value="carpooling">👥 Carpooling Car</SelectItem>
                        <SelectItem value="motorcycle">🏍️ Motorcycle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicleModel">Vehicle Model *</Label>
                    <Input 
                      id="vehicleModel" 
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      placeholder="e.g., Toyota Camry 2020" 
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicleColor">Vehicle Color *</Label>
                    <Input 
                      id="vehicleColor" 
                      value={vehicleColor}
                      onChange={(e) => setVehicleColor(e.target.value)}
                      placeholder="e.g., Black" 
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="licensePlate">License Plate Number *</Label>
                    <Input 
                      id="licensePlate" 
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value)}
                      placeholder="e.g., 123-TUN-456" 
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
                      <Camera className="h-4 w-4" /> National ID (Front) *
                    </Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                      <Input 
                        id="id-front" 
                        type="file" 
                        onChange={(e) => handleFileChange(e, setIdFrontFile)} 
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
                            <p className="text-sm text-muted-foreground">Click to upload front side</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="id-back" className="flex items-center gap-2">
                      <Camera className="h-4 w-4" /> National ID (Back) *
                    </Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                      <Input 
                        id="id-back" 
                        type="file" 
                        onChange={(e) => handleFileChange(e, setIdBackFile)} 
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
                            <p className="text-sm text-muted-foreground">Click to upload back side</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="license-doc" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Driving License *
                  </Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                    <Input 
                      id="license-doc" 
                      type="file" 
                      onChange={(e) => handleFileChange(e, setLicenseFile)} 
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
                          <p className="text-sm text-muted-foreground">Upload clear photo or PDF of your driving license</p>
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
                      <FileText className="h-4 w-4" /> Vehicle Registration (Carte Grise) *
                    </Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                      <Input 
                        id="vehicle-reg" 
                        type="file" 
                        onChange={(e) => handleFileChange(e, setVehicleRegFile)} 
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
                            <p className="text-sm text-muted-foreground">Upload vehicle registration document</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="car-photo" className="flex items-center gap-2">
                      <Camera className="h-4 w-4" /> Car Photo *
                    </Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                      <Input 
                        id="car-photo" 
                        type="file" 
                        onChange={(e) => handleFileChange(e, setCarPhotoFile)} 
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
                            <p className="text-sm text-muted-foreground">Upload a clear photo of your car</p>
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
                      <Car className="h-5 w-5" /> Vehicle Information
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div><span className="text-muted-foreground">Type:</span> <Badge>{vehicleType}</Badge></div>
                      <div><span className="text-muted-foreground">Model:</span> {vehicleModel}</div>
                      <div><span className="text-muted-foreground">Color:</span> {vehicleColor}</div>
                      <div><span className="text-muted-foreground">Plate:</span> {licensePlate}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5" /> Uploaded Documents
                    </h3>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" /> ID Card (Front)
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" /> ID Card (Back)
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" /> Driving License
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" /> Vehicle Registration
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" /> Car Photo
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>Note:</strong> Your registration will be reviewed by our team. This usually takes 24-48 hours. 
                    You'll receive a notification once approved and can start accepting rides!
                  </p>
                </div>
              </div>
            )}

            <Separator />

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)} disabled={loading}>
                  Previous
                </Button>
              )}
              
              <div className="ml-auto">
                {step < 4 ? (
                  <Button 
                    onClick={() => setStep(step + 1)} 
                    disabled={
                      (step === 1 && !canProceedToStep2) ||
                      (step === 2 && !canProceedToStep3) ||
                      (step === 3 && !canSubmit)
                    }
                  >
                    Next
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={loading} className="min-w-32">
                    {loading ? 'Submitting...' : 'Submit Registration'}
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

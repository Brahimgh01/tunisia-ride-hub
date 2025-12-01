import { useState } from 'react';
import { useAuth, Language, UserRole } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, User, Car, Mail, Lock, Phone, MapPin } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from 'next-themes';
import { LanguageToggle } from '@/components/LanguageToggle';
import { loginSchema, signUpSchema } from '@/lib/validation';

const translations = {
  en: {
    welcome: 'Welcome to TuniRide',
    subtitle: 'Your trusted ride companion across Tunisia',
    login: 'Sign In',
    register: 'Sign Up',
    email: 'Email',
    password: 'Password',
    fullName: 'Full Name',
    phone: 'Phone Number',
    accountType: 'Account Type',
    customer: 'Customer',
    driver: 'Driver',
    customerDesc: 'Book rides across Tunisia',
    driverDesc: 'Earn money driving in Tunisia',
    loginBtn: 'Sign In',
    registerBtn: 'Create Account',
    city: 'City',
    selectCity: 'Select your city',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    signingIn: 'Signing in...',
    creatingAccount: 'Creating account...',
    success: 'Success',
    loginSuccess: 'Successfully logged in',
    signUpSuccess: 'Account created successfully',
    error: 'Error',
    fillAllFields: 'Please fill all required fields',
    forgotPassword: 'Forgot Password?',
    enterEmail: 'Enter Email',
    enterEmailFirst: 'Please enter your email address first.',
    passwordReset: 'Password Reset',
    checkEmail: 'Check your email for password reset instructions.',
  },
  fr: {
    welcome: 'Bienvenue sur TuniRide',
    subtitle: 'Votre compagnon de route de confiance en Tunisie',
    login: 'Connexion',
    register: 'Inscription',
    email: 'E-mail',
    password: 'Mot de passe',
    fullName: 'Nom complet',
    phone: 'Numéro de téléphone',
    accountType: 'Type de compte',      
    customer: 'Client',
    driver: 'Chauffeur',
    customerDesc: 'Réservez des trajets en Tunisie',
    driverDesc: 'Gagnez de l\'argent en conduisant',
    loginBtn: 'Se connecter',
    registerBtn: 'Créer un compte',
    city: 'Ville',
    selectCity: 'Sélectionnez votre ville',
    showPassword: 'Afficher le mot de passe',
    hidePassword: 'Masquer le mot de passe',
    signingIn: 'Connexion en cours...',
    creatingAccount: 'Création du compte...',
    success: 'Succès',
    loginSuccess: 'Connexion réussie',
    signUpSuccess: 'Compte créé avec succès',
    error: 'Erreur',
    fillAllFields: 'Veuillez remplir tous les champs obligatoires',
    forgotPassword: 'Mot de passe oublié ?',
    enterEmail: 'Entrez votre e-mail',
    enterEmailFirst: 'Veuillez d\'abord entrer votre adresse e-mail.',
    passwordReset: 'Réinitialisation du mot de passe',
    checkEmail: 'Consultez votre e-mail pour les instructions de réinitialisation.',
  },
  ar: {
    welcome: 'مرحباً بك في تونيرايد',
    subtitle: 'رفيقك الموثوق للتنقل في تونس',
    login: 'تسجيل الدخول',
    register: 'إنشاء حساب',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    fullName: 'الاسم الكامل',
    phone: 'رقم الهاتف',
    accountType: 'نوع الحساب',
    customer: 'عميل',
    driver: 'سائق',
    customerDesc: 'احجز رحلات في جميع أنحاء تونس',
    driverDesc: 'اكسب المال من خلال القيادة',
    loginBtn: 'دخول',
    registerBtn: 'إنشاء حساب',
    city: 'المدينة',
    selectCity: 'اختر مدينتك',
    showPassword: 'إظهار كلمة المرور',
    hidePassword: 'إخفاء كلمة المرور',
    signingIn: 'جاري تسجيل الدخول...',
    creatingAccount: 'جاري إنشاء الحساب...',
    success: 'نجاح',
    loginSuccess: 'تم تسجيل الدخول بنجاح',
    signUpSuccess: 'تم إنشاء الحساب بنجاح',
    error: 'خطأ',
    fillAllFields: 'يرجى ملء جميع الحقول المطلوبة',
    forgotPassword: 'نسيت كلمة المرور؟',
    enterEmail: 'أدخل بريدك الإلكتروني',
    enterEmailFirst: 'يرجى إدخال عنوان بريدك الإلكتروني أولاً.',
    passwordReset: 'إعادة تعيين كلمة المرور',
    checkEmail: 'تحقق من بريدك الإلكتروني للحصول على تعليمات إعادة التعيين.',
  }
};

const tunisianCities = [
  'Tunis', 'Sfax', 'Sousse', 'Kairouan', 'Bizerte', 'Gabès', 'Ariana', 
  'Gafsa', 'Monastir', 'Ben Arous', 'Kasserine', 'Medenine', 'Nabeul',
  'Tataouine', 'Beja', 'Jendouba', 'Mahdia', 'Siliana', 'Manouba',
  'Zaghouan', 'Tozeur', 'Kebili', 'Sidi Bouzid', 'Le Kef'
];

export function AuthForm({ language }: { language: Language }) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp, setLanguage } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const t = translations[language];

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.target as HTMLFormElement);
    const rawData = {
      email: formData.get('email') as string,
      password: formData.get('password') as string
    };

    // Validate input
    const result = loginSchema.safeParse(rawData);
    if (!result.success) {
      toast({
        title: t.error,
        description: result.error.errors[0].message,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await signIn(result.data.email, result.data.password);
      
      if (error) {
        toast({
          title: t.error,
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t.success,
          description: t.loginSuccess,
        });
      }
    } catch (error: any) {
      toast({
        title: t.error,
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.target as HTMLFormElement);
    const rawData = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      fullName: formData.get('fullName') as string,
      phone: formData.get('phone') as string,
      city: formData.get('city') as string
    };

    // Validate input
    const result = signUpSchema.safeParse(rawData);
    if (!result.success) {
      toast({
        title: t.error,
        description: result.error.errors[0].message,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (!selectedRole) {
      toast({
        title: t.error,
        description: t.fillAllFields,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await signUp(result.data.email, result.data.password, {
        fullName: result.data.fullName,
        phone: result.data.phone,
        city: result.data.city,
        role: selectedRole,
      });
      
      if (error) {
        toast({
          title: t.error,
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t.success,
          description: t.signUpSuccess,
        });
      }
    } catch (error: any) {
      toast({
        title: t.error,
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });
      
      if (error) {
        toast({
          title: t.error,
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t.passwordReset,
          description: t.checkEmail,
        });
      }
    } catch (error) {
      toast({
        title: t.error,
        description: t.enterEmailFirst,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-warm flex items-center justify-center p-4 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      <div className="fixed top-4 right-4 flex items-center gap-2 z-10">
        <ThemeToggle />
        <LanguageToggle currentLanguage={language} onLanguageChange={setLanguage} />
      </div>

      <Card className="w-full max-w-md shadow-tunisian border-2 bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-tunisian flex items-center justify-center mb-4 shadow-lg">
            <span className="text-2xl">🇹🇳</span>
          </div>
          <CardTitle className="text-2xl bg-gradient-tunisian bg-clip-text text-transparent font-bold">
            {t.welcome}
          </CardTitle>
          <CardDescription className="text-muted-foreground">{t.subtitle}</CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t.login}</TabsTrigger>
              <TabsTrigger value="register">{t.register}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t.email}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      name="email"
                      type="email" 
                      placeholder="example@email.com"
                      className="pl-10 bg-background/50"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">{t.password}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="password" 
                      name="password"
                      type={showPassword ? "text" : "password"}
                      className="pl-10 pr-10 bg-background/50"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-2 h-6 w-6 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? 
                        <EyeOff className="h-4 w-4" /> : 
                        <Eye className="h-4 w-4" />
                      }
                    </Button>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-tunisian hover:opacity-90 text-white font-semibold shadow-md"
                  disabled={isLoading}
                >
                  {isLoading ? t.signingIn : t.loginBtn}
                </Button>
                
                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-muted-foreground hover:text-primary"
                    onClick={() => {
                      const form = document.querySelector('form') as HTMLFormElement;
                      const emailInput = form?.querySelector('input[name="email"]') as HTMLInputElement;
                      if (emailInput?.value) {
                        handlePasswordReset(emailInput.value);
                      } else {
                        toast({
                          title: t.enterEmail,
                          description: t.enterEmailFirst,
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    {t.forgotPassword}
                  </Button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="register" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t.fullName}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="fullName" 
                      name="fullName"
                      type="text" 
                      className="pl-10 bg-background/50"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">{t.email}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      name="email"
                      type="email" 
                      className="pl-10 bg-background/50"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">{t.phone}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="phone" 
                      name="phone"
                      type="tel" 
                      placeholder="+216 XX XXX XXX"
                      className="pl-10 bg-background/50"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="city">{t.city}</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                    <Select name="city" required>
                      <SelectTrigger className="pl-10 bg-background/50">
                        <SelectValue placeholder={t.selectCity} />
                      </SelectTrigger>
                      <SelectContent>
                        {tunisianCities.map((city) => (
                          <SelectItem key={city} value={city.toLowerCase()}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label>{t.accountType}</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Card 
                      className={`cursor-pointer transition-all border-2 hover:shadow-md ${
                        selectedRole === 'customer' 
                          ? 'border-primary bg-primary/5 shadow-sm' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedRole('customer')}
                    >
                      <CardContent className="p-4 text-center">
                        <User className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <div className="text-sm font-medium">{t.customer}</div>
                        <div className="text-xs text-muted-foreground mt-1">{t.customerDesc}</div>
                      </CardContent>
                    </Card>
                    
                    <Card 
                      className={`cursor-pointer transition-all border-2 hover:shadow-md ${
                        selectedRole === 'driver' 
                          ? 'border-primary bg-primary/5 shadow-sm' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedRole('driver')}
                    >
                      <CardContent className="p-4 text-center">
                        <Car className="h-6 w-6 mx-auto mb-2 text-primary" />
                        <div className="text-sm font-medium">{t.driver}</div>
                        <div className="text-xs text-muted-foreground mt-1">{t.driverDesc}</div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">{t.password}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="password" 
                      name="password"
                      type={showPassword ? "text" : "password"}
                      className="pl-10 pr-10 bg-background/50"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-2 h-6 w-6 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? 
                        <EyeOff className="h-4 w-4" /> : 
                        <Eye className="h-4 w-4" />
                      }
                    </Button>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-tunisian hover:opacity-90 text-white font-semibold shadow-md"
                  disabled={isLoading}
                >
                  {isLoading ? t.creatingAccount : t.registerBtn}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from 'react';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/types';

interface BiometricVerifyProps {
  email: string;
  mode: 'verify' | 'register';
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function BiometricVerify({ email, mode, onSuccess, onCancel }: BiometricVerifyProps) {
  const [loading, setLoading] = useState(false);

  async function getWebAuthnChallenge(action: 'register' | 'login') {
    const supabaseUrl = 'https://iounvptlpsidiaseouzs.supabase.co';
    const res = await fetch(`${supabaseUrl}/functions/v1/webauthn-${action}-challenge`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    });
    return res.json();
  }

  async function verifyWebAuthn(action: 'register' | 'login', credential: RegistrationResponseJSON | AuthenticationResponseJSON) {
    const supabaseUrl = 'https://iounvptlpsidiaseouzs.supabase.co';
    const res = await fetch(`${supabaseUrl}/functions/v1/webauthn-${action}-verify`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, credential })
    });
    return res.json();
  }

  const handleBiometric = async () => {
    setLoading(true);
    try {
      const challenge = await getWebAuthnChallenge(mode === 'register' ? 'register' : 'login');
      let result;
      if (mode === 'register') {
        const attResp = await startRegistration(challenge);
        result = await verifyWebAuthn('register', attResp);
      } else {
        const assertion = await startAuthentication(challenge);
        result = await verifyWebAuthn('login', assertion);
      }
      if (result.success) {
        toast.success('Biometric verified!');
        onSuccess();
      } else {
        toast.error(result.error || 'Biometric verification failed');
      }
    } catch (err: unknown) {
      if(err instanceof Error){
        toast.error(err.message || 'Biometric error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h3 className="text-lg font-bold">{mode === 'register' ? 'Register Biometric' : 'Verify Biometric'}</h3>
      <p>Use your fingerprint or face to continue.</p>
      <Button onClick={handleBiometric} disabled={loading} className="w-full">
        {loading ? 'Processing...' : (mode === 'register' ? 'Register' : 'Verify')}
      </Button>
      {onCancel && (
        <Button variant="outline" onClick={onCancel} className="w-full mt-2">Cancel</Button>
      )}
    </div>
  );
}

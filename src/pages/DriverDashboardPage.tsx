import { useAuth } from '@/hooks/useAuth';
import DriverDashboard from '@/components/DriverDashboard';
import { Navigate } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Moon, Sun, LogOut } from 'lucide-react';

// Theme toggle hook
function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    document.documentElement.classList.toggle('dark', newTheme);
  };

  return { isDark, toggleTheme };
}

export default function DriverDashboardPage() {
  const { user, profile, language, signOut, setLanguage, isLoading } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  // Redirect if not authenticated or not a driver
  if (!isLoading && (!user || !profile)) {
    return <Navigate to="/" replace />;
  }

  // Allow access regardless of role - user can be both customer and driver

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-tunisian flex items-center justify-center mb-4 animate-pulse">
            <span className="text-2xl">🇹🇳</span>
          </div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm relative">
      {/* Header with controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={signOut}
          className="bg-background/80 backdrop-blur-sm text-destructive hover:text-destructive-foreground hover:bg-destructive"
        >
          <LogOut className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleTheme}
          className="bg-background/80 backdrop-blur-sm"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-16 bg-background/80 backdrop-blur-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">🇺🇸</SelectItem>
            <SelectItem value="fr">🇫🇷</SelectItem>
            <SelectItem value="ar">🇹🇳</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <DriverDashboard />
    </div>
  );
}
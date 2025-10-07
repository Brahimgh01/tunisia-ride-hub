import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

export type Language = 'ar' | 'fr' | 'en';

const languages = {
  ar: { name: 'العربية', flag: '🇹🇳' },
  fr: { name: 'Français', flag: '🇫🇷' },
  en: { name: 'English', flag: '🇺🇸' }
};

interface LanguageToggleProps {
  currentLanguage: Language;
  onLanguageChange: (language: Language) => void;
}

export function LanguageToggle({ currentLanguage, onLanguageChange }: LanguageToggleProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{languages[currentLanguage].name}</span>
          <span className="text-lg">{languages[currentLanguage].flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(languages).map(([code, lang]) => (
          <DropdownMenuItem 
            key={code}
            onClick={() => onLanguageChange(code as Language)}
            className="gap-2"
          >
            <span className="text-lg">{lang.flag}</span>
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
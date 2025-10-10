import { useState, useEffect } from 'react';
import { Castle, Building, Mountain, MapPin } from 'lucide-react';

const tunisianIcons = [
  { icon: Castle, name: 'Kairouan Mosque' },
  { icon: Building, name: 'Carthage Ruins' },
  { icon: MapPin, name: 'Sidi Bou Said' },
  { icon: Building, name: 'Dougga Ruins' },
];

export function LoadingScreen() {
  const [currentIconIndex, setCurrentIconIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIconIndex((prev) => (prev + 1) % tunisianIcons.length);
    }, 800);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const CurrentIcon = tunisianIcons[currentIconIndex].icon;

  return (
    <div className="fixed inset-0 bg-gradient-tunisian flex items-center justify-center z-50">
      <div className="text-center">
        <div className="mb-8 relative">
          <div className="w-24 h-24 mx-auto rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 animate-pulse">
            <CurrentIcon className="h-12 w-12 text-white animate-bounce" />
          </div>
          <div className="text-white text-lg font-semibold">
            {tunisianIcons[currentIconIndex].name}
          </div>
        </div>
        
        {/* Loading dots */}
        <div className="flex justify-center space-x-2">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="w-3 h-3 bg-white/60 rounded-full animate-pulse"
              style={{
                animationDelay: `${index * 0.2}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
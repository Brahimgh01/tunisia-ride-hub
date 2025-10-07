import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingProps {
  value: number;
  onChange: (value: number) => void;
  isReadOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Rating({ 
  value, 
  onChange, 
  isReadOnly = false, 
  size = 'md' 
}: RatingProps) {
  const [hoverValue, setHoverValue] = useState<number | undefined>(undefined);
  
  const stars = Array(5).fill(0);

  const handleClick = (newValue: number) => {
    if (!isReadOnly) {
      onChange(newValue);
    }
  };

  const handleMouseEnter = (newValue: number) => {
    if (!isReadOnly) {
      setHoverValue(newValue);
    }
  };

  const handleMouseLeave = () => {
    if (!isReadOnly) {
      setHoverValue(undefined);
    }
  };

  const starSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className="flex items-center">
      {stars.map((_, index) => {
        const starValue = index + 1;
        return (
          <Star
            key={starValue}
            className={cn(
              'cursor-pointer transition-colors',
              (hoverValue || value) >= starValue
                ? 'text-yellow-400'
                : 'text-gray-300 dark:text-gray-600',
              isReadOnly && 'cursor-default',
              starSizeClasses[size]
            )}
            fill={
              (hoverValue || value) >= starValue
                ? 'currentColor'
                : 'none'
            }
            onClick={() => handleClick(starValue)}
            onMouseEnter={() => handleMouseEnter(starValue)}
            onMouseLeave={handleMouseLeave}
          />
        );
      })}
    </div>
  );
}

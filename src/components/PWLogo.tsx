import React from 'react';
import { PW_GLOBAL_LOGO_BASE64 } from '@/lib/logoBase64';

interface PWLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  whiteText?: boolean;
}

export const PWLogo: React.FC<PWLogoProps> = ({ className = '', size = 'md', whiteText = false }) => {
  const heightClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14',
  };

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {/* Real PW Global Logo uploaded by user */}
      <img
        src={PW_GLOBAL_LOGO_BASE64}
        alt="PhysicsWallah Global Logo"
        className={`${heightClasses[size]} w-auto object-contain`}
      />
    </div>
  );
};

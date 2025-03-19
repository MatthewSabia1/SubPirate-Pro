import React from 'react';
import { CheckCircle } from 'lucide-react';

type SuccessMessageProps = {
  message: string | null;
  className?: string;
  variant?: 'default' | 'inline' | 'subtle';
  showIcon?: boolean;
  onDismiss?: () => void;
};

/**
 * Standardized success message component for consistent styling
 */
const SuccessMessage: React.FC<SuccessMessageProps> = ({
  message,
  className = '',
  variant = 'default',
  showIcon = true,
  onDismiss
}) => {
  if (!message) return null;

  const baseStyles = 'text-sm rounded-md';
  
  const variantStyles = {
    default: 'p-3 bg-[#2B543A]/30 text-green-400',
    inline: 'p-2 text-green-400',
    subtle: 'p-2 bg-[#2B543A]/10 text-green-400'
  };
  
  const iconSize = variant === 'default' ? 18 : 16;

  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${className} flex items-start gap-2`}>
      {showIcon && <CheckCircle size={iconSize} className="shrink-0 mt-0.5" />}
      <div className="flex-1">
        {message}
      </div>
      {onDismiss && (
        <button 
          onClick={onDismiss} 
          className="text-green-400/70 hover:text-green-400 transition-colors"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default SuccessMessage;
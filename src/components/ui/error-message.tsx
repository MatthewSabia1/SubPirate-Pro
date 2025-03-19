import React from 'react';
import { AlertTriangle } from 'lucide-react';

type ErrorMessageProps = {
  message: string | null;
  className?: string;
  variant?: 'default' | 'inline' | 'subtle';
  showIcon?: boolean;
  onDismiss?: () => void;
};

/**
 * Standardized error message component for consistent styling
 */
const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  className = '',
  variant = 'default',
  showIcon = true,
  onDismiss
}) => {
  if (!message) return null;

  const baseStyles = 'text-sm rounded-md';
  
  const variantStyles = {
    default: 'p-3 bg-red-900/30 text-red-400',
    inline: 'p-2 text-red-400',
    subtle: 'p-2 bg-red-900/10 text-red-400'
  };
  
  const iconSize = variant === 'default' ? 18 : 16;

  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${className} flex items-start gap-2`}>
      {showIcon && <AlertTriangle size={iconSize} className="shrink-0 mt-0.5" />}
      <div className="flex-1">
        {message}
      </div>
      {onDismiss && (
        <button 
          onClick={onDismiss} 
          className="text-red-400/70 hover:text-red-400 transition-colors"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;
import React from 'react';

interface LoadingSpinnerProps {
  size?: number | 'small' | 'medium' | 'large';
  color?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 8, 
  color = '#C69B7B' 
}) => {
  // Convert named sizes to pixel values
  let sizeValue: number;
  if (typeof size === 'string') {
    switch (size) {
      case 'small':
        sizeValue = 16;
        break;
      case 'medium':
        sizeValue = 32;
        break;
      case 'large':
        sizeValue = 48;
        break;
      default:
        sizeValue = 24;
    }
  } else {
    sizeValue = size;
  }
  
  return (
    <div className="flex justify-center items-center">
      <div 
        className="animate-spin rounded-full border-t-2 border-b-2" 
        style={{ 
          width: `${sizeValue}px`, 
          height: `${sizeValue}px`,
          borderColor: color
        }}
      ></div>
    </div>
  );
};

export default LoadingSpinner; 
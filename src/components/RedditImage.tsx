import React, { useState, useEffect } from 'react';

interface RedditImageProps {
  src: string;
  alt?: string;
  fallbackSrc?: string;
  className?: string;
  width?: number | string;
  height?: number | string;
}

/**
 * A component that handles Reddit images with CORS protection and fallbacks.
 * This component attempts to load the image directly, and if that fails due to CORS,
 * it falls back to a provided fallback image or a generated placeholder.
 */
export default function RedditImage({
  src,
  alt = '',
  fallbackSrc,
  className = '',
  width,
  height
}: RedditImageProps) {
  const [error, setError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);
  
  // Reset error state when the src changes
  useEffect(() => {
    setError(false);
    setFallbackError(false);
  }, [src, fallbackSrc]);
  
  // Validate if the URL is potentially valid
  const isValidUrl = (url: string): boolean => {
    if (!url) return false;
    
    // Only filter out Reddit's special values that aren't actually URLs
    // Don't filter 'nsfw' or 'spoiler' as we want to show these images
    if (url === 'self' || url === 'default' || url === 'image') return false;
    
    try {
      // Basic URL validation
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };
  
  // Check if it's a Reddit image URL
  const isRedditUrl = src && (
    src.includes('redd.it') || 
    src.includes('reddit.com') || 
    src.includes('redditstatic.com')
  );
  
  // Process the image URL to handle Reddit URLs
  const processImageUrl = (url: string) => {
    if (!url) return '';
    
    // For debugging
    if (alt === 'debug') {
      console.log(`Processing image URL: ${url}`);
    }
    
    // Handle special values from Reddit
    if (url === 'nsfw') {
      return `https://api.dicebear.com/7.x/shapes/svg?seed=nsfw&backgroundColor=A40000&radius=12`;
    }
    
    if (url === 'spoiler') {
      return `https://api.dicebear.com/7.x/shapes/svg?seed=spoiler&backgroundColor=512DA8&radius=12`;
    }
    
    if (!isValidUrl(url)) {
      if (alt === 'debug') {
        console.log(`URL failed validation: ${url}`);
      }
      return '';
    }
    
    // Decode HTML entities in the URL (always decode, not just when &amp; is present)
    const decodedUrl = url
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    if (url !== decodedUrl && alt === 'debug') {
      console.log(`URL was decoded from ${url} to ${decodedUrl}`);
    }
    
    // Remove backslashes that sometimes appear in JSON-encoded URLs
    const cleanUrl = decodedUrl.replace(/\\/g, '');
    
    if (decodedUrl !== cleanUrl && alt === 'debug') {
      console.log(`URL was cleaned from ${decodedUrl} to ${cleanUrl}`);
    }
    
    // Use a proxy for Reddit images to avoid CORS issues
    if (isRedditUrl || cleanUrl.includes('redd.it') || cleanUrl.includes('reddit.com')) {
      try {
        // Ensure the URL is properly encoded
        const encodedUrl = encodeURIComponent(cleanUrl);
        
        // Use imgproxy.net as more reliable proxy for Reddit
        const proxyUrl = `https://images.weserv.nl/?url=${encodedUrl}&n=-1&output=webp&fit=inside&maxage=24h&default=https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(alt || 'default')}&backgroundColor=0f0f0f&radius=12`;
        
        if (alt === 'debug') {
          console.log(`Using proxy URL: ${proxyUrl}`);
        }
        
        return proxyUrl;
      } catch (e) {
        console.error('Error processing Reddit URL:', e);
        // Try direct URL as fallback
        return cleanUrl;
      }
    }
    
    return cleanUrl;
  };
  
  // Handle primary image loading errors
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    console.log(`Image failed to load: ${img.src}`, {
      originalSrc: src,
      width: img.naturalWidth,
      height: img.naturalHeight,
      crossOrigin: img.crossOrigin
    });
    setError(true);
  };
  
  // Handle fallback image loading errors
  const handleFallbackError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    console.log(`Fallback image failed to load: ${img.src}`, {
      originalSrc: fallbackSrc,
      width: img.naturalWidth,
      height: img.naturalHeight,
      crossOrigin: img.crossOrigin
    });
    setFallbackError(true);
  };
  
  // Generate a placeholder that's guaranteed to work
  const generatePlaceholder = () => {
    const seed = encodeURIComponent(alt || 'default');
    return `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}&backgroundColor=0f0f0f&radius=12`;
  };
  
  // Determine which image source to use
  let imageSrc = '';
  
  if (!error) {
    // Try the primary image first
    imageSrc = isValidUrl(src) ? processImageUrl(src) : '';
  } else if (!fallbackError && fallbackSrc && isValidUrl(fallbackSrc)) {
    // If primary fails, try the fallback
    imageSrc = processImageUrl(fallbackSrc);
  } else {
    // If both fail, use the guaranteed placeholder
    imageSrc = generatePlaceholder();
  }
  
  // If no valid sources, just show the placeholder
  if (!imageSrc) {
    imageSrc = generatePlaceholder();
  }
  
  // Determine if we should use crossOrigin attribute
  const shouldUseCrossOrigin = imageSrc.includes('weserv.nl') || 
                              imageSrc.includes('redd.it') || 
                              imageSrc.includes('reddit.com');
  
  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      width={width}
      height={height}
      crossOrigin={shouldUseCrossOrigin ? "anonymous" : undefined}
      referrerPolicy="no-referrer"
      onError={error ? (fallbackSrc ? handleFallbackError : undefined) : handleImageError}
      loading="lazy"
    />
  );
} 
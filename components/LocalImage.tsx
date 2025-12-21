
import React, { useState, useEffect } from 'react';
import { imageStorage } from '../services/imageStorage';
import { Image as ImageIcon } from 'lucide-react';

interface LocalImageProps {
  path?: string;
  className?: string;
  alt?: string;
  fallbackIconSize?: number;
}

const LocalImage: React.FC<LocalImageProps> = ({ path, className, alt, fallbackIconSize = 20 }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let currentUrl: string | null = null;

    if (path) {
      imageStorage.getImageBlob(path).then(blob => {
        if (blob && active) {
          currentUrl = URL.createObjectURL(blob);
          setUrl(currentUrl);
        }
      });
    } else {
      setUrl(null);
    }

    return () => {
      active = false;
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [path]);

  if (!url) {
    return (
      <div className={`${className} flex items-center justify-center bg-zinc-800`}>
        <ImageIcon size={fallbackIconSize} className="text-zinc-600" />
      </div>
    );
  }

  return <img src={url} alt={alt || "Product image"} className={className} />;
};

export default LocalImage;

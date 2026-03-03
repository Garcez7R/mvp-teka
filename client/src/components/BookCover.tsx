import { useState, useEffect } from "react";
import { BookOpen } from "lucide-react";

interface BookCoverProps {
  isbn: string;
  title: string;
  className?: string;
}

export default function BookCover({ isbn, title, className = "" }: BookCoverProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!isbn) {
      setIsLoading(false);
      setHasError(true);
      return;
    }

    // Construir URL da capa do Open Library
    const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn.replace(/-/g, "")}-M.jpg`;
    
    // Verificar se a imagem existe fazendo uma requisição HEAD
    const checkImage = async () => {
      try {
        const response = await fetch(coverUrl, { method: "HEAD" });
        if (response.ok) {
          setImageUrl(coverUrl);
          setHasError(false);
        } else {
          setHasError(true);
        }
      } catch (error) {
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkImage();
  }, [isbn]);

  if (isLoading) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
        <div className="animate-pulse">
          <BookOpen className="w-12 h-12 text-gray-300" />
        </div>
      </div>
    );
  }

  if (hasError || !imageUrl) {
    return (
      <div className={`bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center border border-gray-200 ${className}`}>
        <BookOpen className="w-12 h-12 text-[#262969] mb-2" />
        <p className="text-gray-600 text-xs font-inter text-center px-2">Capa indisponível</p>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={`Capa de ${title}`}
      className={`object-cover ${className}`}
      onError={() => setHasError(true)}
    />
  );
}

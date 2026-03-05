import { useState, useEffect } from "react";
import { BookOpen } from "lucide-react";

interface BookCoverProps {
  isbn?: string | null;
  title: string;
  author?: string | null;
  coverUrl?: string | null;
  className?: string;
}

export default function BookCover({ isbn, title, author, coverUrl, className = "" }: BookCoverProps) {
  const curatedByIsbn: Record<string, string> = {
    "9788595084759": "/covers/as-duas-torres.svg",
  };
  const curatedByTitle: Record<string, string> = {
    "dom casmurro": "/covers/dom-casmurro.svg",
    "as duas torres": "/covers/as-duas-torres.svg",
  };

  const [imageUrl, setImageUrl] = useState<string | null>(coverUrl || null);
  const [isLoading, setIsLoading] = useState(!coverUrl);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Se já tem uma coverUrl, use-a diretamente
    if (coverUrl) {
      setImageUrl(coverUrl);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    const resolveImage = async () => {
      try {
        const normalizedIsbn = isbn?.replace(/[^0-9X]/gi, "") ?? "";
        const normalizedTitle = title.trim().toLowerCase();

        if (normalizedIsbn && curatedByIsbn[normalizedIsbn]) {
          setImageUrl(curatedByIsbn[normalizedIsbn]);
          setHasError(false);
          return;
        }

        if (curatedByTitle[normalizedTitle]) {
          setImageUrl(curatedByTitle[normalizedTitle]);
          setHasError(false);
          return;
        }

        if (isbn) {
          // 1) Open Library por ISBN
          const openLibraryCoverUrl = `https://covers.openlibrary.org/b/isbn/${normalizedIsbn}-L.jpg`;
          const openLibraryResponse = await fetch(openLibraryCoverUrl, { method: "HEAD" });
          if (openLibraryResponse.ok && !openLibraryResponse.url.includes("blank")) {
            setImageUrl(openLibraryCoverUrl);
            setHasError(false);
            return;
          }

          // 2) Google Books por ISBN
          const googleByIsbn = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=isbn:${normalizedIsbn}&maxResults=1`
          );
          if (googleByIsbn.ok) {
            const data = await googleByIsbn.json();
            const thumb = data?.items?.[0]?.volumeInfo?.imageLinks?.thumbnail
              || data?.items?.[0]?.volumeInfo?.imageLinks?.smallThumbnail;
            if (thumb) {
              setImageUrl(thumb.replace("http://", "https://"));
              setHasError(false);
              return;
            }
          }
        }

        // 3) Google Books por título/autor
        const query = `intitle:${title}${author ? `+inauthor:${author}` : ""}`;
        const googleByTitle = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`
        );
        if (googleByTitle.ok) {
          const data = await googleByTitle.json();
          const thumb = data?.items?.[0]?.volumeInfo?.imageLinks?.thumbnail
            || data?.items?.[0]?.volumeInfo?.imageLinks?.smallThumbnail;
          if (thumb) {
            setImageUrl(thumb.replace("http://", "https://"));
            setHasError(false);
            return;
          }
        }

        setHasError(true);
      } catch {
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    resolveImage();
  }, [isbn, title, author, coverUrl]);

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
      className={`object-cover bg-white ${className}`}
      onError={() => setHasError(true)}
    />
  );
}

import { Link } from "wouter";
import { MapPin, Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import BookCover from "./BookCover";

interface BookCardProps {
  id: number;
  title: string;
  author?: string;
  category: string;
  price: string | number;
  sebo?: { name: string };
  condition: string;
  isbn?: string;
  coverUrl?: string;
}

export default function BookCard({ id, title, author, category, price, sebo, condition, isbn, coverUrl }: BookCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(id);
  };

  const priceNumber = typeof price === "string" ? parseFloat(price) : price;
  const seboName = typeof sebo === "string" ? sebo : sebo?.name || "Sebo";

  return (
    <div className="group cursor-pointer relative">
      {/* Botão de favorito */}
      <button
        onClick={handleFavoriteClick}
        className="absolute top-2 right-2 z-10 p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-all"
        title={favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      >
        <Heart
          className={`w-5 h-5 transition-colors ${
            favorited ? "fill-[#da4653] text-[#da4653]" : "text-gray-400 hover:text-[#da4653]"
          }`}
        />
      </button>

      <Link href={`/book/${id}`}>
        <div className="rounded-lg overflow-hidden border border-gray-200 group-hover:border-[#da4653] group-hover:shadow-lg transition-all duration-300 aspect-[2/3]">
          <BookCover isbn={isbn} title={title} author={author} coverUrl={coverUrl} className="w-full h-full" />
        </div>

        <div className="mt-4 space-y-2">
          <h3 className="font-outfit font-bold text-[#262969] line-clamp-2 group-hover:text-[#da4653] transition-colors">
            {title}
          </h3>
          
          {author && (
            <p className="font-inter text-xs text-gray-600 line-clamp-1">
              por {author}
            </p>
          )}
          
          <div className="flex items-center gap-2 text-gray-600">
            <span className="text-xs font-inter bg-gray-100 px-2 py-1 rounded">{category}</span>
            <span className="text-xs font-inter px-2 py-1 rounded bg-[#da4653] text-white font-semibold">{condition}</span>
          </div>

          <div className="flex items-center gap-1 text-gray-700 text-sm font-inter">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="truncate">{seboName}</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <span className="font-outfit font-bold text-lg text-[#da4653]">
              R$ {priceNumber.toFixed(2)}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}

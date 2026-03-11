import { Link } from "wouter";
import { MapPin, Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import BookCover from "./BookCover";

interface BookCardProps {
  id: number | string;
  title: string;
  author?: string;
  category: string;
  price: string | number;
  priceLabel?: string;
  sebo?: { name: string; verified?: boolean };
  condition: string;
  isbn?: string;
  coverUrl?: string;
  quantity?: number;
  offerCount?: number;
  locationSummary?: string;
  availabilityStatus?: "ativo" | "reservado" | "vendido";
  matchReason?: "titulo" | "autor" | "isbn" | "titulo_aprox";
  compact?: boolean;
  proximityLabel?: "na_sua_cidade" | "no_seu_estado";
}

export default function BookCard({
  id,
  title,
  author,
  category,
  price,
  priceLabel,
  sebo,
  condition,
  isbn,
  coverUrl,
  quantity,
  offerCount,
  locationSummary,
  availabilityStatus = "ativo",
  matchReason,
  compact = false,
  proximityLabel,
}: BookCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(id);
  };

  const priceNumber = typeof price === "string" ? parseFloat(price) : price;
  const seboName = typeof sebo === "string" ? sebo : sebo?.name || "Sebo";
  const statusLabel =
    availabilityStatus === "reservado"
      ? "Reservado"
      : availabilityStatus === "vendido"
      ? "Vendido"
      : "Disponivel";
  const proximityText = proximityLabel
    ? proximityLabel === "na_sua_cidade"
      ? "Na sua cidade"
      : "No seu estado"
    : null;
  const locationText = locationSummary || seboName;

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
        <div
          className={`rounded-lg overflow-hidden border group-hover:border-[#da4653] group-hover:shadow-lg transition-all duration-300 aspect-[2/3] ${
            compact ? "w-full" : "w-1/3 mx-auto"
          } ${
            availabilityStatus === "vendido" ? "border-gray-300 opacity-80" : "border-gray-200"
          }`}
        >
          <BookCover isbn={isbn} title={title} author={author} coverUrl={coverUrl} className="w-full h-full" />
        </div>

        <div className={`${compact ? "mt-2 space-y-1" : "mt-4 space-y-2"}`}>
          <h3 className={`font-outfit font-bold text-[#262969] line-clamp-2 group-hover:text-[#da4653] transition-colors ${compact ? "text-sm" : ""}`}>
            {title}
          </h3>
          
          {!compact && author && (
            <p className={`font-inter text-gray-600 line-clamp-1 ${compact ? "text-[11px]" : "text-xs"}`}>
              por {author}
            </p>
          )}
          
          <div className={`flex items-center text-gray-600 ${compact ? "gap-1 flex-wrap" : "gap-2"}`}>
            {!compact && (
              <>
                <span className={`font-inter bg-gray-100 rounded ${compact ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"}`}>{category}</span>
                <span className={`font-inter rounded bg-[#da4653] text-white font-semibold ${compact ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"}`}>{condition}</span>
              </>
            )}
            <span
              className={`font-inter rounded font-semibold ${
                compact ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"
              } ${
                availabilityStatus === "vendido"
                  ? "bg-gray-800 text-white"
                  : availabilityStatus === "reservado"
                  ? "bg-amber-500 text-white"
                  : "bg-emerald-600 text-white"
              }`}
            >
              {statusLabel}
            </span>
          </div>

          <div className={`flex items-center gap-1 text-gray-700 font-inter ${compact ? "text-[11px]" : "text-sm"}`}>
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="truncate">{locationText}</span>
            {proximityLabel && (
              <span
                className={`rounded font-semibold ${
                  compact ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5"
                } ${
                  proximityLabel === "na_sua_cidade"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-100"
                    : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-100"
                }`}
              >
                {proximityText}
              </span>
            )}
            {!compact && sebo?.verified && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200 font-semibold">
                Verificado
              </span>
            )}
          </div>
          {!compact && matchReason && (
            <p className="text-[11px] text-[#262969]">
              Match por{" "}
              <span className="font-semibold">
                {matchReason === "isbn"
                  ? "ISBN"
                  : matchReason === "autor"
                  ? "autor"
                  : matchReason === "titulo_aprox"
                  ? "título aproximado"
                  : "título"}
              </span>
            </p>
          )}
          {!compact && typeof quantity === "number" && (
            <p className="text-xs text-gray-600">Unidades: {quantity}</p>
          )}
          {!compact && typeof offerCount === "number" && offerCount > 1 && (
            <p className="text-xs text-[#262969] font-medium">{offerCount} ofertas para este título</p>
          )}

          <div className={`flex items-center justify-between border-t border-gray-200 ${compact ? "pt-1" : "pt-2"}`}>
            <span className={`font-outfit font-bold text-[#da4653] ${compact ? "text-base" : "text-lg"}`}>
              {priceLabel || `R$ ${priceNumber.toFixed(2)}`}
            </span>
            {!compact && (
              <span className="text-xs font-semibold text-[#262969] group-hover:text-[#da4653]">
                Ver detalhes
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

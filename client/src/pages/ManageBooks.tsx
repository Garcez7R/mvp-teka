import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { ArrowLeft, Upload, Edit2, Trash2, Search as SearchIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { put } from "@vercel/blob";

interface EditingBook {
  id: number;
  title: string;
  author?: string;
  isbn?: string;
  price: number;
  coverUrl?: string;
  newCoverFile?: File;
}

export default function ManageBooks() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingBook, setEditingBook] = useState<EditingBook | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: mySebo } = trpc.sebos.getMySebo.useQuery(undefined, {
    enabled: isAuthenticated
  });
  const { data: myBooks = [] } = trpc.books.listBySebo.useQuery(
    mySebo?.id || 0,
    { enabled: !!mySebo }
  );

  const updateBookMutation = trpc.books.update.useMutation({
    onSuccess: async () => {
      await utils.books.listBySebo.invalidate();
    },
  });
  const deleteBookMutation = trpc.books.delete.useMutation({
    onSuccess: async () => {
      await utils.books.listBySebo.invalidate();
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="font-outfit font-bold text-2xl text-[#262969] mb-4">
            Acesso Restrito
          </h1>
          <p className="text-gray-600 mb-6">Você precisa fazer login.</p>
          <a
            href={getLoginUrl()}
            className="inline-block bg-[#da4653] text-white font-outfit font-bold py-2 px-6 rounded-lg"
          >
            Fazer Login
          </a>
        </div>
      </div>
    );
  }

  if (!mySebo) {
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-gradient-to-br from-[#262969] to-[#1a1a4d] text-white py-6">
          <div className="container">
            <Link href="/">
              <button className="flex items-center gap-2 text-white hover:opacity-80 mb-4">
                <ArrowLeft className="w-5 h-5" />
                Voltar
              </button>
            </Link>
          </div>
        </div>
        <div className="container py-12 text-center">
          <p className="text-gray-600 mb-6">Você precisa criar um sebo primeiro.</p>
          <Link href="/sebo/novo">
            <button className="bg-[#da4653] text-white font-outfit font-bold py-2 px-6 rounded-lg">
              Criar Sebo
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const filteredBooks = myBooks.filter(
    (book: any) =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (book.author?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const handleEdit = (book: typeof myBooks[0]) => {
    setEditingId(book.id);
    setEditingBook({
      id: book.id,
      title: book.title,
      author: book.author || undefined,
      isbn: book.isbn || undefined,
      price: Number(book.price),
      coverUrl: book.coverUrl || undefined,
    });
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingBook) {
      setEditingBook({
        ...editingBook,
        newCoverFile: file,
        coverUrl: URL.createObjectURL(file),
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingBook) return;

    try {
      setIsUploading(true);
      let coverUrl = editingBook.coverUrl;

      // Upload new cover if file selected
      if (editingBook.newCoverFile) {
        try {
          if (import.meta.env.PROD) {
            const blob = await put(editingBook.newCoverFile.name, editingBook.newCoverFile, {
              access: "public",
              multipart: true,
            });
            coverUrl = blob.url;
          } else {
            console.warn("Using local URL in development");
            coverUrl = URL.createObjectURL(editingBook.newCoverFile);
          }
        } catch (error: any) {
          toast.error("Erro ao fazer upload: " + error.message);
          setIsUploading(false);
          return;
        }
      }

      // build payload separately so we can conditionally include optional fields
      const payload: any = {
        id: editingBook.id,
        title: editingBook.title,
        author: editingBook.author || undefined,
        price: editingBook.price,
        coverUrl: coverUrl || undefined,
      };
      if (editingBook.isbn) {
        payload.isbn = editingBook.isbn;
      }

      await updateBookMutation.mutateAsync(payload);

      toast.success("Livro atualizado com sucesso!");
      setEditingId(null);
      setEditingBook(null);
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar livro");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (bookId: number, title: string) => {
    if (!confirm(`Deseja excluir "${title}"? Esta ação não pode ser desfeita.`)) return;

    try {
      setDeletingId(bookId);
      await deleteBookMutation.mutateAsync(bookId);
      toast.success("Livro deletado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao deletar livro");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#262969] to-[#1a1a4d] text-white py-6">
        <div className="container">
          <Link href="/">
            <button className="flex items-center gap-2 text-white hover:opacity-80 mb-4">
              <ArrowLeft className="w-5 h-5" />
              Voltar
            </button>
          </Link>
          <h1 className="font-outfit font-bold text-3xl">Meus Livros</h1>
          <p className="text-gray-200 mt-2">{mySebo.name}</p>
        </div>
      </div>

      {/* Content */}
      <div className="container py-12">
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-gray-600 text-lg">
              Total de livros: <span className="font-bold text-[#262969]">{myBooks.length}</span>
            </p>
          </div>
          <Link href="/add-book">
            <button className="bg-[#da4653] hover:bg-[#c23a45] text-white font-inter font-medium py-2 px-6 rounded-lg">
              + Novo Livro
            </button>
          </Link>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título ou autor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] outline-none"
            />
          </div>
        </div>

        {/* Books Grid */}
        {filteredBooks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredBooks.map((book: any) => (
              <div
                key={book.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Cover Preview */}
                <div className="bg-gray-100 h-48 flex items-center justify-center overflow-hidden">
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-gray-400">Sem capa</div>
                  )}
                </div>

                {/* Book Info */}
                <div className="p-4">
                  {editingId === book.id ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={editingBook?.title || ""}
                        onChange={(e) =>
                          setEditingBook({
                            ...editingBook!,
                            title: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#da4653] outline-none"
                      />

                      <input
                        type="text"
                        placeholder="Autor"
                        value={editingBook?.author || ""}
                        onChange={(e) =>
                          setEditingBook({
                            ...editingBook!,
                            author: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#da4653] outline-none"
                      />

                      <input
                        type="number"
                        placeholder="Preço"
                        step="0.01"
                        value={editingBook?.price?.toString() || ""}
                        onChange={(e) =>
                          setEditingBook({
                            ...editingBook!,
                            price: parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#da4653] outline-none"
                      />

                      {/* Cover Upload */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Atualizar Capa
                        </label>
                        <label className="block border-2 border-dashed border-gray-300 rounded p-3 text-center cursor-pointer hover:border-[#da4653]">
                          <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                          <p className="text-xs text-gray-600">Clique para atualizar</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCoverChange}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {/* Edit Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={isUploading}
                          className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-2 rounded font-medium text-sm"
                        >
                          {isUploading ? "Salvando..." : "Salvar"}
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditingBook(null);
                          }}
                          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded font-medium text-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <h3 className="font-outfit font-semibold text-lg text-[#262969] mb-1">
                        {book.title}
                      </h3>
                      {book.author && (
                        <p className="text-sm text-gray-600 mb-2">por {book.author}</p>
                      )}
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xl font-bold text-[#da4653]">
                          R$ {Number(book.price).toFixed(2)}
                        </span>
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          {book.condition}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(book)}
                          className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded font-medium text-sm"
                        >
                          <Edit2 className="w-4 h-4" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(book.id, book.title)}
                          disabled={deletingId === book.id}
                          className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2 rounded font-medium text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          {deletingId === book.id ? "Deletando..." : "Deletar"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Nenhum livro cadastrado ainda.</p>
            <Link href="/add-book">
              <button className="bg-[#da4653] text-white font-outfit font-bold py-2 px-6 rounded-lg">
                Cadastrar Primeiro Livro
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

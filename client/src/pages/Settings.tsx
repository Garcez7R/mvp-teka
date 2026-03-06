import { useEffect, useState } from "react";
import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, Camera, Download, CheckCircle2 } from "lucide-react";
import { SESSION_MAX_AGE_MS } from "@/lib/session";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type BeforeInstallPromptEventLike = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function SettingsPage() {
  const { role, isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const canManageSebo = role === "livreiro" || role === "admin";
  const utils = trpc.useUtils();
  const { data: mySebo } = trpc.sebos.getMySebo.useQuery(undefined, {
    enabled: isAuthenticated && canManageSebo,
    refetchOnWindowFocus: false,
  });
  const updateSeboMutation = trpc.sebos.update.useMutation({
    onSuccess: async () => {
      await utils.sebos.getMySebo.invalidate();
      toast.success("Dados do sebo atualizados.");
    },
    onError: (error) => {
      toast.error(error.message || "Falha ao atualizar sebo.");
    },
  });
  const [seboForm, setSeboForm] = useState({
    name: "",
    whatsapp: "",
    city: "",
    state: "",
    description: "",
    ownerName: "",
    documentId: "",
    addressLine: "",
    postalCode: "",
    openingYear: "",
    logoUrl: "",
  });
  const [installAvailable, setInstallAvailable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installStatus, setInstallStatus] = useState("");
  const [cameraStatus, setCameraStatus] = useState("Não verificado");
  const [cameraHelpText, setCameraHelpText] = useState("");
  const [cameraHelpCopied, setCameraHelpCopied] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    if (!mySebo) {
      setSeboForm({
        name: "",
        whatsapp: "",
        city: "",
        state: "",
        description: "",
        ownerName: "",
        documentId: "",
        addressLine: "",
        postalCode: "",
        openingYear: "",
        logoUrl: "",
      });
      return;
    }
    setSeboForm({
      name: mySebo.name || "",
      whatsapp: mySebo.whatsapp || "",
      city: mySebo.city || "",
      state: mySebo.state || "",
      description: mySebo.description || "",
      ownerName: (mySebo as any).ownerName || "",
      documentId: (mySebo as any).documentId || "",
      addressLine: (mySebo as any).addressLine || "",
      postalCode: (mySebo as any).postalCode || "",
      openingYear: (mySebo as any).openingYear ? String((mySebo as any).openingYear) : "",
      logoUrl: (mySebo as any).logoUrl || "",
    });
  }, [mySebo]);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(Boolean(standalone));
    setIsAndroid(/Android/i.test(navigator.userAgent || ""));

    const refreshInstallAvailability = () => {
      const available = Boolean((window as any).__TEKA_BEFORE_INSTALL_PROMPT__);
      setInstallAvailable(available);
    };

    refreshInstallAvailability();
    window.addEventListener("teka:pwa-install-available", refreshInstallAvailability);
    window.addEventListener("teka:pwa-installed", refreshInstallAvailability);

    return () => {
      window.removeEventListener("teka:pwa-install-available", refreshInstallAvailability);
      window.removeEventListener("teka:pwa-installed", refreshInstallAvailability);
    };
  }, []);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);

    let steps: string[] = [];
    if (isAndroid) {
      steps = isStandalone
        ? [
            "1. Abra Configurações do Android > Apps > TEKA.",
            "2. Entre em Permissões > Câmera.",
            "3. Marque como Permitir.",
            "4. Volte ao app e toque em Verificar câmera.",
          ]
        : [
            "1. No Chrome, toque no cadeado da URL.",
            "2. Abra Permissões do site > Câmera.",
            "3. Defina como Permitir.",
            "4. Recarregue a página e toque em Verificar câmera.",
          ];
    } else if (isIOS) {
      steps = isStandalone
        ? [
            "1. Abra Ajustes do iPhone > TEKA.",
            "2. Ative a opção Câmera.",
            "3. Volte ao app e toque em Verificar câmera.",
          ]
        : [
            "1. Abra Ajustes do iPhone > Safari > Câmera.",
            "2. Selecione Permitir.",
            "3. Reabra o site e toque em Verificar câmera.",
          ];
    } else {
      steps = [
        "1. No Chrome, clique no cadeado ao lado da URL.",
        "2. Em Câmera, selecione Permitir.",
        "3. Recarregue a página.",
        "4. Se necessário, confira em chrome://settings/content/camera.",
      ];
    }

    setCameraHelpText(steps.join("\n"));
  }, [isStandalone]);

  useEffect(() => {
    if (!window.isSecureContext) {
      setCameraStatus("A câmera só funciona em contexto seguro (HTTPS ou localhost).");
      return;
    }
    if (!navigator.permissions?.query) return;
    void navigator.permissions
      .query({ name: "camera" as PermissionName })
      .then((result) => {
        if (result.state === "granted") {
          setCameraStatus("Permissão já concedida.");
          return;
        }
        if (result.state === "denied") {
          setCameraStatus(
            "Permissão negada. No app instalado, libere em Configurações do sistema > Apps > Permissões > Câmera."
          );
          return;
        }
        setCameraStatus("Permissão pendente. Clique em Verificar câmera para solicitar acesso.");
      })
      .catch(() => {});
  }, []);

  const handleInstall = async () => {
    const event = (window as any)
      .__TEKA_BEFORE_INSTALL_PROMPT__ as BeforeInstallPromptEventLike | undefined;

    if (!event) {
      setInstallStatus("Instalação não disponível neste navegador/contexto.");
      return;
    }

    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") {
      setInstallStatus("App instalado com sucesso.");
      (window as any).__TEKA_BEFORE_INSTALL_PROMPT__ = undefined;
      setInstallAvailable(false);
    } else {
      setInstallStatus("Instalação cancelada.");
    }
  };

  const handleCheckCamera = async () => {
    if (!window.isSecureContext) {
      setCameraStatus("A câmera só funciona em HTTPS (ou localhost no modo local).");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("Este dispositivo/navegador não suporta câmera.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach((track) => track.stop());
      setCameraStatus("Permissão concedida e câmera disponível.");
    } catch (error: any) {
      const name = error?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setCameraStatus(
          "Permissão negada. No app instalado, libere em Configurações do sistema > Apps > Permissões > Câmera."
        );
        return;
      }
      if (name === "NotFoundError") {
        setCameraStatus("Nenhuma câmera encontrada no dispositivo.");
        return;
      }
      setCameraStatus("Não foi possível acessar a câmera agora.");
    }
  };

  const handleCopyCameraHelp = async () => {
    try {
      await navigator.clipboard.writeText(cameraHelpText);
      setCameraHelpCopied(true);
      window.setTimeout(() => setCameraHelpCopied(false), 2000);
    } catch {
      setInstallStatus("Não foi possível copiar automaticamente as instruções.");
    }
  };

  const handleOpenBrowserCameraSettings = () => {
    try {
      window.open("chrome://settings/content/camera", "_blank", "noopener,noreferrer");
    } catch {
      setInstallStatus("Abra manualmente: chrome://settings/content/camera");
    }
  };

  const handleSaveSebo = async () => {
    if (!mySebo?.id) return;
    if (!seboForm.name.trim() || !seboForm.whatsapp.trim()) {
      toast.error("Nome e WhatsApp do sebo são obrigatórios.");
      return;
    }
    await updateSeboMutation.mutateAsync({
      id: mySebo.id,
      name: seboForm.name.trim(),
      whatsapp: seboForm.whatsapp.trim(),
      city: seboForm.city.trim() || undefined,
      state: seboForm.state.trim().toUpperCase() || undefined,
      description: seboForm.description.trim() || undefined,
      ownerName: seboForm.ownerName.trim() || undefined,
      documentId: seboForm.documentId.trim() || undefined,
      addressLine: seboForm.addressLine.trim() || undefined,
      postalCode: seboForm.postalCode.trim() || undefined,
      openingYear: seboForm.openingYear ? Number(seboForm.openingYear) : undefined,
      logoUrl: seboForm.logoUrl.trim() || undefined,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="container flex-1 py-10">
        <Link href="/">
          <button className="flex items-center gap-2 text-gray-600 hover:text-[#262969] transition-colors font-inter text-sm font-medium mb-6">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </Link>

        <h1 className="font-outfit font-bold text-3xl text-[#262969] mb-6">Configurações</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {canManageSebo && (
            <section className="border border-gray-200 rounded-xl p-5 bg-white md:col-span-2">
              <h2 className="font-outfit font-semibold text-xl text-[#262969] mb-2">Meu Sebo</h2>
              {!mySebo ? (
                <div className="text-sm text-gray-700">
                  Você ainda não possui sebo.
                  <Link href="/sebo/novo" className="ml-2 text-[#da4653] hover:underline">
                    Criar sebo agora
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      value={seboForm.name}
                      onChange={(e) => setSeboForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Nome do sebo"
                      className="px-3 py-2 border border-gray-300 rounded bg-white"
                    />
                    <input
                      value={seboForm.whatsapp}
                      onChange={(e) => setSeboForm((prev) => ({ ...prev, whatsapp: e.target.value }))}
                      placeholder="WhatsApp"
                      className="px-3 py-2 border border-gray-300 rounded bg-white"
                    />
                    <input
                      value={seboForm.city}
                      onChange={(e) => setSeboForm((prev) => ({ ...prev, city: e.target.value }))}
                      placeholder="Cidade"
                      className="px-3 py-2 border border-gray-300 rounded bg-white"
                    />
                    <input
                      value={seboForm.state}
                      onChange={(e) => setSeboForm((prev) => ({ ...prev, state: e.target.value }))}
                      placeholder="UF"
                      maxLength={2}
                      className="px-3 py-2 border border-gray-300 rounded bg-white"
                    />
                    <input
                      value={seboForm.postalCode}
                      onChange={(e) => setSeboForm((prev) => ({ ...prev, postalCode: e.target.value }))}
                      placeholder="CEP"
                      className="px-3 py-2 border border-gray-300 rounded bg-white"
                    />
                    <input
                      value={seboForm.ownerName}
                      onChange={(e) => setSeboForm((prev) => ({ ...prev, ownerName: e.target.value }))}
                      placeholder="Nome do sebista"
                      className="px-3 py-2 border border-gray-300 rounded bg-white"
                    />
                    <input
                      value={seboForm.documentId}
                      onChange={(e) => setSeboForm((prev) => ({ ...prev, documentId: e.target.value }))}
                      placeholder="CPF/CNPJ (sem validação)"
                      className="px-3 py-2 border border-gray-300 rounded bg-white"
                    />
                    <input
                      value={seboForm.addressLine}
                      onChange={(e) => setSeboForm((prev) => ({ ...prev, addressLine: e.target.value }))}
                      placeholder="Endereço"
                      className="px-3 py-2 border border-gray-300 rounded bg-white"
                    />
                    <input
                      value={seboForm.openingYear}
                      onChange={(e) => setSeboForm((prev) => ({ ...prev, openingYear: e.target.value }))}
                      placeholder="Ano de abertura"
                      type="number"
                      className="px-3 py-2 border border-gray-300 rounded bg-white"
                    />
                    <input
                      value={seboForm.logoUrl}
                      onChange={(e) => setSeboForm((prev) => ({ ...prev, logoUrl: e.target.value }))}
                      placeholder="URL do logo"
                      className="px-3 py-2 border border-gray-300 rounded bg-white"
                    />
                  </div>
                  <textarea
                    value={seboForm.description}
                    onChange={(e) => setSeboForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição do sebo"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveSebo()}
                    disabled={updateSeboMutation.isPending}
                    className="px-4 py-2 rounded-lg bg-[#262969] text-white hover:bg-[#1e2157] disabled:opacity-60"
                  >
                    {updateSeboMutation.isPending ? "Salvando..." : "Salvar dados do sebo"}
                  </button>
                </div>
              )}
            </section>
          )}

          <section className="border border-gray-200 rounded-xl p-5 bg-white">
            <h2 className="font-outfit font-semibold text-xl text-[#262969] mb-2">Instalar App</h2>
            <p className="text-sm text-gray-600 mb-4">
              Instale o TEKA no dispositivo para abrir como app (PWA).
            </p>
            <button
              type="button"
              onClick={() => void handleInstall()}
              disabled={!installAvailable || isStandalone}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#262969] text-white hover:bg-[#1e2157] disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isStandalone
                ? "App já instalado"
                : installAvailable
                ? "Instalar aplicativo"
                : "Instalação indisponível"}
            </button>
            {installStatus ? (
              <p className="mt-3 text-sm text-gray-700">{installStatus}</p>
            ) : null}
            {isAndroid && !isStandalone && !installAvailable ? (
              <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
                <p className="text-xs text-amber-800 font-medium">
                  No Android, se o botão estiver indisponível, instale pelo menu do Chrome:
                  <span className="font-semibold"> ⋮ &gt; Instalar app</span> ou
                  <span className="font-semibold"> Adicionar à tela inicial</span>.
                </p>
              </div>
            ) : null}
          </section>

          <section className="border border-gray-200 rounded-xl p-5 bg-white">
            <h2 className="font-outfit font-semibold text-xl text-[#262969] mb-2">Permissão de Câmera</h2>
            <p className="text-sm text-gray-600 mb-4">
              Necessária para escanear código de barras ou capa no cadastro de livros.
            </p>
            <button
              type="button"
              onClick={() => void handleCheckCamera()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#da4653] text-white hover:bg-[#c23a45]"
            >
              <Camera className="w-4 h-4" />
              Verificar câmera
            </button>
            <p className="mt-3 text-sm text-gray-700">Status: {cameraStatus}</p>
            <div className="mt-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
              <p className="text-sm font-semibold text-[#262969] mb-2">Como liberar câmera</p>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-inter">
                {cameraHelpText}
              </pre>
              <div className="mt-3 flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => void handleCopyCameraHelp()}
                  className="px-3 py-1.5 text-xs rounded border border-gray-300 hover:bg-gray-100"
                >
                  {cameraHelpCopied ? "Instruções copiadas" : "Copiar instruções"}
                </button>
                <button
                  type="button"
                  onClick={handleOpenBrowserCameraSettings}
                  className="px-3 py-1.5 text-xs rounded border border-gray-300 hover:bg-gray-100"
                >
                  Abrir config do Chrome
                </button>
                <Link
                  href="/add-book?scan=barcode"
                  className="px-3 py-1.5 text-xs rounded border border-[#1f7a8c] text-[#1f7a8c] hover:bg-[#1f7a8c] hover:text-white"
                >
                  Testar câmera no cadastro
                </Link>
              </div>
            </div>
          </section>

          <section className="border border-gray-200 rounded-xl p-5 bg-white md:col-span-2">
            <h2 className="font-outfit font-semibold text-xl text-[#262969] mb-2">Sessão</h2>
            <p className="text-sm text-gray-600 mb-2">
              A sessão expira em {Math.floor(SESSION_MAX_AGE_MS / 60000)} minutos.
            </p>
            <p className="text-sm text-gray-700 inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Re-login silencioso é tentado automaticamente quando a sessão expira.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

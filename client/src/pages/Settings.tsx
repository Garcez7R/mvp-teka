import { useEffect, useState } from "react";
import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppLink from "@/components/WhatsAppLink";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, Camera, Download, CheckCircle2 } from "lucide-react";
import { SESSION_MAX_AGE_MS } from "@/lib/session";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { formatCpfCnpjInput } from "@/lib/formatters";

type BeforeInstallPromptEventLike = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function SettingsPage() {
  const { role, isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const canManageSebo = role === "livreiro" || role === "admin";
  const utils = trpc.useUtils();
  const { data: me } = trpc.users.me.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });
  const updateUserMutation = trpc.users.update.useMutation({
    onSuccess: async () => {
      await utils.users.me.invalidate();
      toast.success("Dados do comprador atualizados.");
    },
    onError: (error) => {
      toast.error(error.message || "Falha ao atualizar seus dados.");
    },
  });
  const [buyerForm, setBuyerForm] = useState({
    name: "",
    whatsapp: "",
    city: "",
    state: "",
    lgpdConsent: false,
  });
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
    supportsPickup: true,
    shipsNeighborhood: false,
    shipsCity: false,
    shipsState: false,
    shipsNationwide: false,
    shippingAreas: "",
    shippingFeeNotes: "",
    shippingEta: "",
    shippingNotes: "",
  });
  const [installAvailable, setInstallAvailable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installStatus, setInstallStatus] = useState("");
  const [cameraStatus, setCameraStatus] = useState("Não verificado");
  const [cameraHelpText, setCameraHelpText] = useState("");
  const [cameraHelpCopied, setCameraHelpCopied] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    if (!me) return;
    setBuyerForm({
      name: me.name || "",
      whatsapp: (me as any).whatsapp || "",
      city: (me as any).city || "",
      state: (me as any).state || "",
      lgpdConsent: Boolean((me as any).lgpdConsentAt),
    });
  }, [me]);

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
        supportsPickup: true,
        shipsNeighborhood: false,
        shipsCity: false,
        shipsState: false,
        shipsNationwide: false,
        shippingAreas: "",
        shippingFeeNotes: "",
        shippingEta: "",
        shippingNotes: "",
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
      supportsPickup: Boolean((mySebo as any).supportsPickup ?? true),
      shipsNeighborhood: Boolean((mySebo as any).shipsNeighborhood ?? false),
      shipsCity: Boolean((mySebo as any).shipsCity ?? false),
      shipsState: Boolean((mySebo as any).shipsState ?? false),
      shipsNationwide: Boolean((mySebo as any).shipsNationwide ?? false),
      shippingAreas: (mySebo as any).shippingAreas || "",
      shippingFeeNotes: (mySebo as any).shippingFeeNotes || "",
      shippingEta: (mySebo as any).shippingEta || "",
      shippingNotes: (mySebo as any).shippingNotes || "",
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
      supportsPickup: seboForm.supportsPickup,
      shipsNeighborhood: seboForm.shipsNeighborhood,
      shipsCity: seboForm.shipsCity,
      shipsState: seboForm.shipsState,
      shipsNationwide: seboForm.shipsNationwide,
      shippingAreas: seboForm.shippingAreas.trim() || undefined,
      shippingFeeNotes: seboForm.shippingFeeNotes.trim() || undefined,
      shippingEta: seboForm.shippingEta.trim() || undefined,
      shippingNotes: seboForm.shippingNotes.trim() || undefined,
    });
  };

  const handleSaveBuyer = async () => {
    await updateUserMutation.mutateAsync({
      name: buyerForm.name.trim() || undefined,
      whatsapp: buyerForm.whatsapp.trim() || undefined,
      city: buyerForm.city.trim() || undefined,
      state: buyerForm.state.trim().toUpperCase() || undefined,
      lgpdConsent: buyerForm.lgpdConsent,
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
          <section className="border border-gray-200 rounded-xl p-5 bg-white md:col-span-2">
            <h2 className="font-outfit font-semibold text-xl text-[#262969] mb-2">Dados do Comprador (Privado)</h2>
            <p className="text-sm text-gray-600 mb-3">
              Esses dados não são exibidos publicamente para outros usuários e podem ser acessados apenas por administradores para suporte e obrigações legais.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={buyerForm.name}
                onChange={(e) => setBuyerForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo"
                className="px-3 py-2 border border-gray-300 rounded bg-white"
              />
              <input
                value={buyerForm.whatsapp}
                onChange={(e) => setBuyerForm((prev) => ({ ...prev, whatsapp: e.target.value }))}
                placeholder="WhatsApp"
                className="px-3 py-2 border border-gray-300 rounded bg-white"
              />
              <input
                value={buyerForm.city}
                onChange={(e) => setBuyerForm((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="Cidade"
                className="px-3 py-2 border border-gray-300 rounded bg-white"
              />
              <input
                value={buyerForm.state}
                onChange={(e) => setBuyerForm((prev) => ({ ...prev, state: e.target.value }))}
                placeholder="UF"
                maxLength={2}
                className="px-3 py-2 border border-gray-300 rounded bg-white"
              />
            </div>
            <label className="mt-3 inline-flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={buyerForm.lgpdConsent}
                onChange={(e) => setBuyerForm((prev) => ({ ...prev, lgpdConsent: e.target.checked }))}
              />
              <span>
                Autorizo o tratamento destes dados para suporte, segurança e atendimento de obrigações legais.
              </span>
            </label>
            <p className="mt-2 text-xs text-gray-600">
              Base legal informativa: LGPD (Lei nº 13.709/2018), arts. 7º, 18 e 46; Marco Civil da Internet (Lei nº 12.965/2014), art. 15.
            </p>
            <button
              type="button"
              onClick={() => void handleSaveBuyer()}
              disabled={updateUserMutation.isPending}
              className="mt-3 px-4 py-2 rounded-lg bg-[#262969] text-white hover:bg-[#1e2157] disabled:opacity-60"
            >
              {updateUserMutation.isPending ? "Salvando..." : "Salvar dados privados"}
            </button>
          </section>

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
                      onChange={(e) =>
                        setSeboForm((prev) => ({
                          ...prev,
                          documentId: formatCpfCnpjInput(e.target.value),
                        }))
                      }
                      placeholder="CPF/CNPJ"
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
                  <div className="p-3 border border-gray-200 rounded bg-white">
                    <p className="text-sm font-semibold text-[#262969] mb-2">Logística de Entrega</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={seboForm.supportsPickup}
                          onChange={(e) => setSeboForm((prev) => ({ ...prev, supportsPickup: e.target.checked }))}
                        />
                        Retirada no local
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={seboForm.shipsNeighborhood}
                          onChange={(e) => setSeboForm((prev) => ({ ...prev, shipsNeighborhood: e.target.checked }))}
                        />
                        Entrega no bairro
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={seboForm.shipsCity}
                          onChange={(e) => setSeboForm((prev) => ({ ...prev, shipsCity: e.target.checked }))}
                        />
                        Entrega na cidade
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={seboForm.shipsState}
                          onChange={(e) => setSeboForm((prev) => ({ ...prev, shipsState: e.target.checked }))}
                        />
                        Entrega no estado
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={seboForm.shipsNationwide}
                          onChange={(e) => setSeboForm((prev) => ({ ...prev, shipsNationwide: e.target.checked }))}
                        />
                        Envio nacional
                      </label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        value={seboForm.shippingAreas}
                        onChange={(e) => setSeboForm((prev) => ({ ...prev, shippingAreas: e.target.value }))}
                        placeholder="Bairros/regiões atendidas"
                        className="px-3 py-2 border border-gray-300 rounded bg-white"
                      />
                      <input
                        value={seboForm.shippingEta}
                        onChange={(e) => setSeboForm((prev) => ({ ...prev, shippingEta: e.target.value }))}
                        placeholder="Prazo médio"
                        className="px-3 py-2 border border-gray-300 rounded bg-white"
                      />
                      <input
                        value={seboForm.shippingFeeNotes}
                        onChange={(e) => setSeboForm((prev) => ({ ...prev, shippingFeeNotes: e.target.value }))}
                        placeholder="Frete/custos"
                        className="md:col-span-2 px-3 py-2 border border-gray-300 rounded bg-white"
                      />
                    </div>
                    <textarea
                      value={seboForm.shippingNotes}
                      onChange={(e) => setSeboForm((prev) => ({ ...prev, shippingNotes: e.target.value }))}
                      placeholder="Observações logísticas"
                      rows={2}
                      className="mt-3 w-full px-3 py-2 border border-gray-300 rounded bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSaveSebo()}
                    disabled={updateSeboMutation.isPending}
                    className="px-4 py-2 rounded-lg bg-[#262969] text-white hover:bg-[#1e2157] disabled:opacity-60"
                  >
                    {updateSeboMutation.isPending ? "Salvando..." : "Salvar dados do sebo"}
                  </button>
                  <div className="mt-2 border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <p className="text-sm font-semibold text-[#262969] mb-3">Prévia pública do sebo</p>
                    <div className="flex items-start gap-3">
                      {seboForm.logoUrl ? (
                        <img
                          src={seboForm.logoUrl}
                          alt="Logo do sebo"
                          className="w-16 h-16 object-cover rounded border border-gray-200 bg-white"
                        />
                      ) : (
                        <img
                          src="/teka-logo.png"
                          alt="Logo TEKA padrão"
                          className="w-16 h-16 object-contain rounded border border-gray-200 bg-white p-1"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-[#262969]">{seboForm.name || "Nome do sebo"}</p>
                        <p className="text-xs text-gray-600">
                          {seboForm.city || "-"} / {seboForm.state || "-"}
                          {seboForm.postalCode ? ` • CEP ${seboForm.postalCode}` : ""}
                        </p>
                        {seboForm.addressLine && (
                          <p className="text-xs text-gray-600">{seboForm.addressLine}</p>
                        )}
                        <p className="text-xs text-gray-600 mt-1">
                          Entrega:{" "}
                          {[
                            seboForm.supportsPickup ? "Retirada" : null,
                            seboForm.shipsNeighborhood ? "Bairro" : null,
                            seboForm.shipsCity ? "Cidade" : null,
                            seboForm.shipsState ? "Estado" : null,
                            seboForm.shipsNationwide ? "Nacional" : null,
                          ]
                            .filter(Boolean)
                            .join(" • ") || "Não informado"}
                        </p>
                        {seboForm.description && (
                          <p className="text-xs text-gray-700 mt-1 line-clamp-3">{seboForm.description}</p>
                        )}
                        {seboForm.whatsapp && (
                          <WhatsAppLink
                            href={`https://wa.me/${seboForm.whatsapp.replace(/\D/g, "")}`}
                            className="inline-block mt-2 text-xs text-[#da4653] hover:underline"
                            iconClassName="w-3 h-3"
                          >
                            Contato do sebo no WhatsApp
                          </WhatsAppLink>
                        )}
                      </div>
                    </div>
                  </div>
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

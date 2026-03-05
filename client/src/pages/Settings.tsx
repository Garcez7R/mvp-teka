import { useEffect, useState } from "react";
import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, Camera, Download, CheckCircle2 } from "lucide-react";
import { SESSION_MAX_AGE_MS } from "@/lib/session";

type BeforeInstallPromptEventLike = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function SettingsPage() {
  useAuth({ redirectOnUnauthenticated: true });
  const [installAvailable, setInstallAvailable] = useState(false);
  const [installStatus, setInstallStatus] = useState("");
  const [cameraStatus, setCameraStatus] = useState("Não verificado");

  useEffect(() => {
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
        setCameraStatus("Permissão negada. Libere a câmera nas configurações do navegador.");
        return;
      }
      if (name === "NotFoundError") {
        setCameraStatus("Nenhuma câmera encontrada no dispositivo.");
        return;
      }
      setCameraStatus("Não foi possível acessar a câmera agora.");
    }
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
          <section className="border border-gray-200 rounded-xl p-5 bg-white">
            <h2 className="font-outfit font-semibold text-xl text-[#262969] mb-2">Instalar App</h2>
            <p className="text-sm text-gray-600 mb-4">
              Instale o TEKA no dispositivo para abrir como app (PWA).
            </p>
            <button
              type="button"
              onClick={() => void handleInstall()}
              disabled={!installAvailable}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#262969] text-white hover:bg-[#1e2157] disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {installAvailable ? "Instalar aplicativo" : "Instalação indisponível"}
            </button>
            {installStatus ? (
              <p className="mt-3 text-sm text-gray-700">{installStatus}</p>
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

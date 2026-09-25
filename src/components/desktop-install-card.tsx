"use client";

import { Check, Download, Monitor } from "lucide-react";
import { useEffect, useState } from "react";

type InstallOutcome = "accepted" | "dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallOutcome; platform: string }>;
}

function isDesktopBrowser() {
  if (typeof window === "undefined") return false;
  const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent);
  return !mobileUserAgent && window.matchMedia("(min-width: 769px)").matches;
}

export function DesktopInstallCard() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const updateDesktopState = () => setIsDesktop(isDesktopBrowser());
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };

    updateDesktopState();
    window.addEventListener("resize", updateDesktopState);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("resize", updateDesktopState);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (!isDesktop) return null;

  async function installApp() {
    if (!installEvent) {
      setShowInstructions((current) => !current);
      return;
    }

    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallEvent(null);
  }

  return (
    <section className="mt-4 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:block sm:p-5" aria-label="Установка приложения">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
            <Monitor size={21} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[.14em] text-blue-700/75">Версия для компьютера</p>
            <h3 className="mt-1 text-base font-bold tracking-tight text-gray-900">Установите Медиа Центр как приложение</h3>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-gray-500">Откроется отдельным окном без вкладки браузера и будет доступен из меню приложений.</p>
          </div>
        </div>
        <button type="button" onClick={() => void installApp()} className="ui-button ui-button--primary shrink-0">
          {installed ? <Check size={16} /> : <Download size={16} />}
          {installed ? "Приложение установлено" : "Установить приложение"}
        </button>
      </div>
      {showInstructions && !installed && (
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-sm leading-5 text-blue-950">
          <p className="font-semibold">Установка через меню браузера</p>
          <p className="mt-1 text-blue-900/75">В Chrome или Edge нажмите значок установки в адресной строке. В Safari выберите «Файл → Добавить в Dock».</p>
        </div>
      )}
      <p className="mt-3 text-xs leading-5 text-gray-500">Автозапуск Windows включается после установки: <span className="font-semibold text-gray-700">Win+R → shell:startup</span>, затем добавьте туда ярлык приложения.</p>
    </section>
  );
}

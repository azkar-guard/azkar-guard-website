import { t } from "../lib/i18n";
import { getSettings, onChange } from "../lib/storage";
import { h } from "./dom";

const DISMISSED_KEY = "azkar-guard:installDismissed";

/** Chrome's install prompt event (not in the DOM typings yet). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

/** iPhone/iPad Safari has no install prompt; installing is manual through the Share sheet. */
function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/**
 * Shows an install card when the app can be installed: Chrome's own prompt on Android and
 * desktop, or Share → Add to Home Screen instructions on iOS. Hidden once installed or dismissed.
 */
export function mountInstall(container: HTMLElement): void {
  let deferred: BeforeInstallPromptEvent | null = null;

  const dismissed = () => localStorage.getItem(DISMISSED_KEY) === "1";

  const render = async () => {
    const { language: lang } = await getSettings();
    if (isStandalone() || dismissed() || (!deferred && !isIos())) {
      container.replaceChildren();
      return;
    }

    const later = h("button", { type: "button", class: "btn secondary" }, t(lang, "install.dismiss"));
    later.addEventListener("click", () => {
      localStorage.setItem(DISMISSED_KEY, "1");
      void render();
    });

    let action: HTMLElement;
    if (deferred) {
      const install = h("button", { type: "button", class: "btn primary" }, t(lang, "install.button"));
      install.addEventListener("click", async () => {
        const prompt = deferred;
        if (!prompt) return;
        deferred = null;
        await prompt.prompt();
        await prompt.userChoice;
        void render();
      });
      action = h("div", { class: "actions" }, install, later);
    } else {
      action = h("div", {}, h("p", {}, t(lang, "install.ios")), h("div", { class: "actions" }, later));
    }

    container.replaceChildren(
      h(
        "aside",
        { class: "panel install" },
        h("img", { src: "/icons/icon-192.png", alt: "", width: "48", height: "48" }),
        h("div", {}, h("strong", {}, t(lang, "install.title")), h("p", { class: "muted" }, t(lang, "install.body")), action),
      ),
    );
  };

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // show our own card instead of the browser's mini-infobar
    deferred = e as BeforeInstallPromptEvent;
    void render();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    void render();
  });
  onChange(["settings"], () => void render());
  void render();
}

import "./ui/base.css";
import "./ui/app.css";
import { mountChecklist } from "./ui/checklist";
import { mountInstall } from "./ui/install";
import { mountToolbar } from "./ui/prefs";
import { mountSettings } from "./ui/settings";

const app = document.getElementById("app")!;
const settingsLink = document.getElementById("open-settings")!;

// Two views, switched by the URL hash so the back button and the installed app both work.
let unmount: (() => void) | undefined;
function route(): void {
  unmount?.();
  const onSettings = location.hash === "#/settings";
  settingsLink.hidden = onSettings;
  unmount = onSettings ? mountSettings(app) : mountChecklist(app);
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
mountToolbar(document.getElementById("toolbar")!);
mountInstall(document.getElementById("install")!);
route();

// The service worker makes the app work offline. It is only built for production.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  void navigator.serviceWorker.register("/sw.js");
}

import { createSSRApp } from "vue";
import App from "./App.vue";
import GlobalNotification from "@/components/GlobalNotification.vue";
import { getStoredTheme, syncThemeUi } from "@/utils/theme";

export function createApp() {
  const app = createSSRApp(App);

  app.mixin({
    onShow() {
      syncThemeUi(getStoredTheme());
    },
  });

  app.component("GlobalNotification", GlobalNotification);

  return {
    app,
  };
}

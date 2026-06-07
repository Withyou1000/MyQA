import { createSSRApp } from "vue";
import App from "./App.vue";
import "./theme-compat.scss";
import GlobalNotification from "@/components/GlobalNotification.vue";
import {
  getStoredTheme,
  getThemeHostClass,
  syncThemeUi,
  themeState,
} from "@/utils/theme";

if (typeof uni !== "undefined") {
  syncThemeUi(getStoredTheme());
}

export function createApp() {
  const app = createSSRApp(App);

  app.mixin({
    computed: {
      themePageClass() {
        return getThemeHostClass(themeState.value);
      },
    },
    onShow() {
      syncThemeUi(getStoredTheme());
    },
  });

  app.component("GlobalNotification", GlobalNotification);

  return {
    app,
  };
}

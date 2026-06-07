import { ref } from "vue";

const THEME_STORAGE_KEY = "appTheme";
const DEFAULT_THEME = "light";

const themePalette = {
  light: {
    tabBarText: "#9a8790",
    tabBarSelected: "#ff7f96",
    tabBarBackground: "#fff8f5",
    navigationBackground: "#fff7f3",
    navigationText: "#000000",
    backgroundTop: "#fff9f6",
    backgroundBottom: "#fffaf8",
  },
  dark: {
    tabBarText: "#938aa2",
    tabBarSelected: "#ff9aac",
    tabBarBackground: "#1b1822",
    navigationBackground: "#16131d",
    navigationText: "#ffffff",
    backgroundTop: "#16131d",
    backgroundBottom: "#221b2c",
  },
  ink: {
    tabBarText: "#869195",
    tabBarSelected: "#1A96BE",
    tabBarBackground: "#eef4f1",
    navigationBackground: "#eef3ef",
    navigationText: "#000000",
    backgroundTop: "#f1f5f2",
    backgroundBottom: "#dbece3",
  },
};

const sharedLightFont =
  '"Avenir Next", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
const inkBodyFont =
  '"Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
const inkDisplayFont =
  '"GracefulFont", "STKaiti", "KaiTi", "Kaiti SC", "FangSong", serif';

const themeCssVars = {
  light: {
    "--app-ink": "#433649",
    "--app-ink-soft": "#736578",
    "--app-ink-muted": "#9b8ea0",
    "--app-accent": "#ff7f96",
    "--app-accent-strong": "#ff6585",
    "--app-accent-soft": "#ffe3e8",
    "--app-peach": "#ffc89d",
    "--app-mint": "#83d0b8",
    "--app-cream": "#fffaf8",
    "--app-cream-strong": "#fffdfb",
    "--app-radius-xl": "32rpx",
    "--app-surface": "rgba(255, 255, 255, 0.92)",
    "--app-surface-soft": "#fff1ec",
    "--app-line": "rgba(255, 150, 167, 0.2)",
    "--app-shadow-soft": "0 18rpx 42rpx rgba(255, 138, 160, 0.14)",
    "--app-shadow-card": "0 12rpx 28rpx rgba(222, 146, 128, 0.12)",
    "--app-shadow-strong": "0 20rpx 48rpx rgba(255, 122, 146, 0.2)",
    "--app-page-bg":
      "radial-gradient(circle at top left, rgba(255, 198, 156, 0.26), transparent 32%), radial-gradient(circle at top right, rgba(255, 133, 163, 0.18), transparent 26%), linear-gradient(180deg, #fff9f6 0%, #fff3ef 56%, #fffaf8 100%)",
    "--app-hero-gradient": "linear-gradient(135deg, #ffb990 0%, #ff90a6 100%)",
    "--app-hero-overlay":
      "radial-gradient(circle at top right, rgba(255, 255, 255, 0.36), transparent 30%)",
    "--app-card-border": "rgba(255, 255, 255, 0.7)",
    "--app-surface-alt": "rgba(255, 255, 255, 0.28)",
    "--app-input-bg": "linear-gradient(180deg, #fff8f5 0%, #fff2ed 100%)",
    "--app-font-body": sharedLightFont,
    "--app-font-display": sharedLightFont,
    "--app-hero-text": "#ffffff",
    "--app-primary-gradient": "linear-gradient(135deg, #ff8ea1 0%, #ffb48f 100%)",
    "--app-primary-shadow": "0 20rpx 48rpx rgba(255, 122, 146, 0.2)",
    "--app-accent-badge-bg": "rgba(255, 127, 150, 0.12)",
    "--app-neutral-chip-bg": "#fff2ec",
    "--app-success-bg": "rgba(131, 208, 184, 0.16)",
    "--app-success-text": "#279979",
    "--app-warning-bg": "rgba(255, 179, 107, 0.18)",
    "--app-warning-text": "#c77e13",
    "--app-info-bg": "rgba(120, 179, 255, 0.18)",
    "--app-info-text": "#407cd5",
    "--app-danger-bg": "rgba(242, 106, 122, 0.16)",
    "--app-danger-text": "#d85f6d",
    "--app-mask-bg": "rgba(67, 54, 73, 0.34)",
  },
  dark: {
    "--app-ink": "#f5eef9",
    "--app-ink-soft": "#cbc1d6",
    "--app-ink-muted": "#a495b3",
    "--app-accent": "#ff95ad",
    "--app-accent-strong": "#ffafc1",
    "--app-accent-soft": "rgba(255, 149, 173, 0.16)",
    "--app-peach": "#c89a80",
    "--app-mint": "#79b4a5",
    "--app-cream": "#18141f",
    "--app-cream-strong": "#201927",
    "--app-radius-xl": "32rpx",
    "--app-surface": "rgba(30, 24, 39, 0.92)",
    "--app-surface-soft": "rgba(46, 36, 57, 0.9)",
    "--app-line": "rgba(255, 182, 198, 0.16)",
    "--app-shadow-soft": "0 18rpx 44rpx rgba(10, 8, 15, 0.34)",
    "--app-shadow-card": "0 14rpx 36rpx rgba(8, 6, 14, 0.28)",
    "--app-shadow-strong": "0 22rpx 56rpx rgba(31, 19, 38, 0.42)",
    "--app-page-bg":
      "radial-gradient(circle at top left, rgba(255, 132, 169, 0.16), transparent 30%), radial-gradient(circle at top right, rgba(122, 199, 177, 0.14), transparent 24%), linear-gradient(180deg, #16131d 0%, #1c1624 46%, #241c30 100%)",
    "--app-hero-gradient": "linear-gradient(135deg, #2e2438 0%, #4e2f48 100%)",
    "--app-hero-overlay":
      "radial-gradient(circle at top right, rgba(255, 255, 255, 0.08), transparent 30%)",
    "--app-card-border": "rgba(255, 255, 255, 0.06)",
    "--app-surface-alt": "rgba(255, 255, 255, 0.06)",
    "--app-input-bg":
      "linear-gradient(180deg, rgba(46, 36, 57, 0.95) 0%, rgba(31, 24, 40, 0.98) 100%)",
    "--app-font-body": sharedLightFont,
    "--app-font-display": sharedLightFont,
    "--app-hero-text": "#ffffff",
    "--app-primary-gradient": "linear-gradient(135deg, #4a3249 0%, #6c4863 52%, #c8879e 100%)",
    "--app-primary-shadow": "0 20rpx 52rpx rgba(59, 36, 58, 0.34)",
    "--app-accent-badge-bg": "rgba(255, 149, 173, 0.16)",
    "--app-neutral-chip-bg": "rgba(46, 36, 57, 0.92)",
    "--app-success-bg": "rgba(122, 199, 177, 0.16)",
    "--app-success-text": "#95d0bf",
    "--app-warning-bg": "rgba(200, 154, 128, 0.18)",
    "--app-warning-text": "#edc5ac",
    "--app-info-bg": "rgba(150, 169, 221, 0.18)",
    "--app-info-text": "#c4d0ff",
    "--app-danger-bg": "rgba(209, 125, 139, 0.18)",
    "--app-danger-text": "#f0b3be",
    "--app-mask-bg": "rgba(17, 14, 24, 0.48)",
  },
  ink: {
    "--app-ink": "#2f3538",
    "--app-ink-soft": "#59666b",
    "--app-ink-muted": "#869195",
    "--app-accent": "#1A96BE",
    "--app-accent-strong": "#1A96BE",
    "--app-accent-soft": "rgba(26, 150, 190, 0.1)",
    "--app-peach": "#c6aa77",
    "--app-mint": "#4d9071",
    "--app-cream": "#f4f7f4",
    "--app-cream-strong": "#fbfcfb",
    "--app-radius-xl": "32rpx",
    "--app-surface": "rgba(248, 250, 248, 0.72)",
    "--app-surface-soft": "rgba(232, 239, 235, 0.72)",
    "--app-line": "rgba(134, 145, 149, 0.16)",
    "--app-shadow-soft": "0 18rpx 40rpx rgba(88, 108, 111, 0.1)",
    "--app-shadow-card": "0 12rpx 28rpx rgba(88, 108, 111, 0.1)",
    "--app-shadow-strong": "0 18rpx 40rpx rgba(35, 118, 137, 0.18)",
    "--app-page-bg":
      "radial-gradient(circle at 18% 24%, rgba(26, 150, 190, 0.1), transparent 24%), radial-gradient(circle at 82% 72%, rgba(66, 160, 112, 0.1), transparent 28%), linear-gradient(180deg, #f2f4f2 0%, #ebf2ef 38%, #dceee8 100%)",
    "--app-hero-gradient":
      "linear-gradient(135deg, rgba(235, 243, 240, 0.97) 0%, rgba(215, 233, 226, 0.95) 56%, rgba(205, 226, 233, 0.96) 100%)",
    "--app-hero-overlay":
      "radial-gradient(circle at top right, rgba(26, 150, 190, 0.12), transparent 28%), radial-gradient(circle at bottom left, rgba(66, 160, 112, 0.11), transparent 30%)",
    "--app-card-border": "rgba(134, 145, 149, 0.24)",
    "--app-surface-alt": "rgba(247, 250, 248, 0.78)",
    "--app-input-bg":
      "linear-gradient(180deg, rgba(246, 249, 247, 0.94) 0%, rgba(231, 239, 235, 0.9) 100%)",
    "--app-font-body": inkBodyFont,
    "--app-font-display": inkDisplayFont,
    "--app-hero-text": "#2f3538",
    "--app-primary-gradient":
      "linear-gradient(135deg, rgba(22, 113, 145, 0.96) 0%, rgba(26, 150, 190, 0.92) 42%, rgba(66, 160, 112, 0.98) 100%)",
    "--app-primary-shadow": "0 18rpx 36rpx rgba(43, 126, 124, 0.16)",
    "--app-accent-badge-bg": "rgba(26, 150, 190, 0.12)",
    "--app-neutral-chip-bg": "rgba(134, 145, 149, 0.12)",
    "--app-success-bg": "rgba(66, 160, 112, 0.12)",
    "--app-success-text": "#2f7659",
    "--app-warning-bg": "rgba(184, 148, 86, 0.14)",
    "--app-warning-text": "#8a6b34",
    "--app-info-bg": "rgba(26, 150, 190, 0.12)",
    "--app-info-text": "#16779a",
    "--app-danger-bg": "rgba(159, 84, 72, 0.12)",
    "--app-danger-text": "#9f5448",
    "--app-mask-bg": "rgba(47, 53, 56, 0.24)",
  },
};

export const themeOptions = [
  {
    value: "light",
    label: "暖杏浅色",
    description: "柔和明亮，适合日常浏览",
  },
  {
    value: "ink",
    label: "青绿水墨",
    description: "釉蓝与葱绿交织，轻宣纸质感与留白更克制",
  },
  {
    value: "dark",
    label: "夜幕深色",
    description: "更沉静，也更适合夜间使用",
  },
];

export const normalizeTheme = (theme) => {
  if (theme === "dark" || theme === "ink") return theme;
  return DEFAULT_THEME;
};

const getInitialTheme = () => {
  if (typeof uni === "undefined") return DEFAULT_THEME;
  return normalizeTheme(uni.getStorageSync(THEME_STORAGE_KEY));
};

export const themeState = ref(getInitialTheme());

export const getThemeHostClass = (theme = themeState.value) =>
  `theme-${normalizeTheme(theme)}`;

export const getStoredTheme = () =>
  normalizeTheme(uni.getStorageSync(THEME_STORAGE_KEY));

export const getThemePalette = (theme) => themePalette[normalizeTheme(theme)];

const syncThemeDocument = (theme) => {
  if (typeof document === "undefined") return;

  const nextTheme = normalizeTheme(theme);
  const cssVars = themeCssVars[nextTheme];

  Object.entries(cssVars).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });

  document.documentElement.setAttribute("data-app-theme", nextTheme);

  if (document.body) {
    document.body.setAttribute("data-app-theme", nextTheme);
  }
};

export const syncThemeUi = (theme) => {
  const nextTheme = normalizeTheme(theme);
  const palette = getThemePalette(nextTheme);

  themeState.value = nextTheme;
  syncThemeDocument(nextTheme);

  if (typeof uni.setBackgroundColor === "function") {
    uni.setBackgroundColor({
      backgroundColor: palette.backgroundTop,
      backgroundColorTop: palette.backgroundTop,
      backgroundColorBottom: palette.backgroundBottom,
    });
  }

  if (typeof uni.setNavigationBarColor === "function") {
    uni.setNavigationBarColor({
      frontColor: palette.navigationText,
      backgroundColor: palette.navigationBackground,
      animation: {
        duration: 0,
        timingFunc: "linear",
      },
    });
  }

  return nextTheme;
};

export const applyTheme = (theme, options = {}) => {
  const { persist = true } = options;
  const nextTheme = normalizeTheme(theme);

  if (persist) {
    uni.setStorageSync(THEME_STORAGE_KEY, nextTheme);
  }

  syncThemeUi(nextTheme);
  uni.$emit("themeChange", nextTheme);

  return nextTheme;
};

export const initTheme = () => {
  const storedTheme = getStoredTheme();
  applyTheme(storedTheme, { persist: false });
};

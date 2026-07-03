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
    tabBarText: "#2b2528",
    tabBarSelected: "#0a0a0a",
    tabBarBackground: "#fbfff0",
    navigationBackground: "#dfff13",
    navigationText: "#000000",
    backgroundTop: "#dfff13",
    backgroundBottom: "#fbfff0",
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
    "--app-ink": "#111111",
    "--app-ink-soft": "#34312c",
    "--app-ink-muted": "#68635b",
    "--app-accent": "#dfff13",
    "--app-accent-strong": "#bdf600",
    "--app-accent-soft": "rgba(223, 255, 19, 0.34)",
    "--app-peach": "#ff9f7a",
    "--app-mint": "#8be8ff",
    "--app-cream": "#fbfff0",
    "--app-cream-strong": "#ffffff",
    "--app-radius-xl": "32rpx",
    "--app-surface": "rgba(255, 255, 248, 0.96)",
    "--app-surface-soft": "#f6ffd7",
    "--app-line": "rgba(17, 17, 17, 0.22)",
    "--app-shadow-soft": "8rpx 9rpx 0 rgba(17, 17, 17, 0.12)",
    "--app-shadow-card": "7rpx 8rpx 0 rgba(17, 17, 17, 0.1)",
    "--app-shadow-strong": "9rpx 10rpx 0 rgba(17, 17, 17, 0.16)",
    "--app-page-bg": "#dfff13",
    "--app-hero-gradient": "linear-gradient(135deg, #dfff13 0%, #f3ff5b 58%, #8be8ff 100%)",
    "--app-hero-overlay": "radial-gradient(circle at 16% 18%, rgba(255, 255, 255, 0.55), transparent 22%)",
    "--app-card-border": "#111111",
    "--app-surface-alt": "rgba(255, 255, 255, 0.72)",
    "--app-input-bg": "#fffdf6",
    "--app-font-body": sharedLightFont,
    "--app-font-display": sharedLightFont,
    "--app-hero-text": "#111111",
    "--app-primary-gradient": "linear-gradient(135deg, #dfff13 0%, #c9ff00 100%)",
    "--app-primary-shadow": "6rpx 7rpx 0 rgba(17, 17, 17, 0.18)",
    "--app-accent-badge-bg": "rgba(223, 255, 19, 0.42)",
    "--app-neutral-chip-bg": "#f6ffd7",
    "--app-success-bg": "rgba(139, 232, 255, 0.32)",
    "--app-success-text": "#0b6473",
    "--app-warning-bg": "rgba(255, 159, 122, 0.24)",
    "--app-warning-text": "#d4522c",
    "--app-info-bg": "rgba(139, 232, 255, 0.28)",
    "--app-info-text": "#175c9e",
    "--app-danger-bg": "rgba(255, 123, 163, 0.2)",
    "--app-danger-text": "#d73c70",
    "--app-mask-bg": "rgba(17, 17, 17, 0.24)",
  },
};

export const themeOptions = [
  {
    value: "light",
    label: "系统默认",
    description: "跟随应用默认外观，清爽稳定",
  },
  {
    value: "ink",
    label: "荧光漫画",
    description: "高亮荧光绿、粗黑描边和纸感卡片，参考潮流插画界面",
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

export interface LocaleStrings {
  brandTitle: string;
  brandSubtitle: string;
  seed: string;
  randomize: string;
  palettes: string;
  sizeScale: string;
  normal: string;
  small: string;
  extraSmall: string;
  micro: string;
  nano: string;
  aspectRatio: string;
  desktop: string;
  desktopRes: string;
  iphonePortrait: string;
  iphonePortraitRes: string;
  iphoneLandscape: string;
  iphoneLandscapeRes: string;
  customAccents: string;
  autoSelected: string;
  saveToFavorites: string;
  savedGallery: string;
  designNamePrompt: string;
  defaultDesignName: string;
  downloadSvg: string;
  downloadPng: string;
}

export const LOCALES: Record<string, LocaleStrings> = {
  en: {
    brandTitle: "Catpattern",
    brandSubtitle: "Procedural Catppuccin Mandala Generator",
    seed: "Seed",
    randomize: "Randomize",
    palettes: "Palettes (Themes)",
    sizeScale: "Pattern Size Scale",
    normal: "Normal (100% Area)",
    small: "Small (50% Area)",
    extraSmall: "Extra Small (25% Area)",
    micro: "Micro (10% Area)",
    nano: "Nano (5% Area)",
    aspectRatio: "Aspect Ratio & Layout",
    desktop: "Desktop Wallpaper",
    desktopRes: "4K Landscape (3840 × 2160)",
    iphonePortrait: "iPhone Lockscreen",
    iphonePortraitRes: "Portrait (1170 × 2532)",
    iphoneLandscape: "iPhone Landscape",
    iphoneLandscapeRes: "Landscape (2532 × 1170)",
    customAccents: "Custom Accents",
    autoSelected: "Auto Selected",
    saveToFavorites: "Save to Favorites",
    savedGallery: "Saved Gallery",
    designNamePrompt: "Enter a name for this design:",
    defaultDesignName: "Design",
    downloadSvg: "Download SVG",
    downloadPng: "Download PNG (4K)",
  },
  zh: {
    brandTitle: "Catpattern 貓形圖騰",
    brandSubtitle: "程序化 Catppuccin 曼陀羅生成器",
    seed: "隨機數種子",
    randomize: "隨機生成",
    palettes: "色彩主題 (Themes)",
    sizeScale: "圖騰尺寸比例",
    normal: "標準 (100% 面積)",
    small: "小尺寸 (50% 面積)",
    extraSmall: "特小尺寸 (25% 面積)",
    micro: "極小尺寸 (10% 面積)",
    nano: "微型尺寸 (5% 面積)",
    aspectRatio: "畫面比例與佈局",
    desktop: "電腦桌布",
    desktopRes: "4K 橫向 (3840 × 2160)",
    iphonePortrait: "iPhone 鎖定畫面",
    iphonePortraitRes: "縱向 (1170 × 2532)",
    iphoneLandscape: "iPhone 橫向桌布",
    iphoneLandscapeRes: "橫向 (2532 × 1170)",
    customAccents: "自訂強調色",
    autoSelected: "自動挑選",
    saveToFavorites: "儲存至收藏夾",
    savedGallery: "收藏畫廊",
    designNamePrompt: "請輸入此設計的名稱：",
    defaultDesignName: "設計款式",
    downloadSvg: "下載 SVG 向量圖",
    downloadPng: "下載 PNG (4K)",
  }
};

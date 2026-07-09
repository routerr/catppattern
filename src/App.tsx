import { useState, useEffect } from "react";
import {
  buildPattern,
  CATPPUCCIN_THEMES,
  ACCENTS,
  lerpColor,
} from "./generator";
import type { PatternConfig, CatppuccinTheme } from "./generator";
import "./App.css";

interface FavoriteItem {
  id: string;
  name: string;
  seed: number;
  themeKey: string;
  sizeKey: string;
  layout: "desktop" | "iphone-portrait" | "iphone-landscape";
  manualAccents: boolean;
  selectedAccents: [string, string];
}

function App() {
  // Config state
  const [seed, setSeed] = useState<number>(42);
  const [themeKey, setThemeKey] = useState<string>("mocha");
  const [layout, setLayout] = useState<"desktop" | "iphone-portrait" | "iphone-landscape">("desktop");
  const [sizeKey, setSizeKey] = useState<string>("normal");

  // Custom accents state
  const [manualAccents, setManualAccents] = useState<boolean>(false);
  const [selectedAccents, setSelectedAccents] = useState<[string, string]>(["sky", "flamingo"]);

  // Favorites state
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  // Set the current size area scale factor
  const sizeMap: Record<string, number> = {
    normal: 1.0,
    small: 0.5,
    "extra-small": 0.25,
    micro: 0.1,
    nano: 0.05,
  };
  const areaScale = sizeMap[sizeKey] || 1.0;

  // Generate the pattern config
  const config: PatternConfig = buildPattern(
    seed,
    themeKey,
    areaScale,
    manualAccents ? selectedAccents : undefined
  );

  // Sync theme colors with CSS variables dynamically
  useEffect(() => {
    const root = document.documentElement;
    const theme = CATPPUCCIN_THEMES[themeKey] || CATPPUCCIN_THEMES.mocha;
    Object.entries(theme).forEach(([key, val]) => {
      if (typeof val === "string") {
        root.style.setProperty(`--ctp-${key}`, val);
      }
    });
  }, [themeKey]);

  // Sync active pattern accents with CSS variables dynamically
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent-color-1", config.accent1);
    root.style.setProperty("--accent-color-2", config.accent2);
  }, [config.accent1, config.accent2]);

  // Sync document page title with the active seed
  useEffect(() => {
    document.title = `Catpattern - Seed ${config.seed}`;
  }, [config.seed]);

  // Sync dynamic square SVG favicon based on current pattern and theme
  useEffect(() => {
    const theme = CATPPUCCIN_THEMES[themeKey] || CATPPUCCIN_THEMES.mocha;
    const size = 64;
    let svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.5 -0.5 1.0 1.0" width="${size}" height="${size}" style="background-color: ${theme.base}; border-radius: 50%;">`;
    
    config.families.forEach((fam) => {
      const scaledLw = fam.lw / 2160.0;
      fam.petalPaths.forEach((petal) => {
        svgString += `<path d="${petal.d}" fill="none" stroke="${petal.color}" stroke-width="${scaledLw}" stroke-linecap="round" stroke-linejoin="round" opacity="${fam.alpha}" />`;
      });
    });
    
    svgString += `<circle cx="0" cy="0" r="${config.pupilR}" fill="${theme.crust}" />`;
    svgString += `<circle cx="0" cy="0" r="${config.pupilR}" fill="none" stroke="${lerpColor(config.accent1, config.accent2, 0.5)}" stroke-width="${1.1 / 2160.0}" opacity="0.55" />`;
    svgString += `</svg>`;
    
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.type = "image/svg+xml";
    const oldUrl = link.href;
    link.href = url;
    
    return () => {
      if (oldUrl && oldUrl.startsWith("blob:")) {
        URL.revokeObjectURL(oldUrl);
      }
    };
  }, [config, themeKey]);

  // Load favorites from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("catpattern-favorites");
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load favorites", e);
      }
    }
  }, []);

  const saveFavorites = (items: FavoriteItem[]) => {
    setFavorites(items);
    localStorage.setItem("catpattern-favorites", JSON.stringify(items));
  };

  // Add current design to favorites
  const handleAddToFavorites = () => {
    const name = prompt("Enter a name for this design:", `Design ${seed}`);
    if (name === null) return;
    const newItem: FavoriteItem = {
      id: Date.now().toString(),
      name: name.trim() || `Design ${seed}`,
      seed,
      themeKey,
      sizeKey,
      layout,
      manualAccents,
      selectedAccents,
    };
    saveFavorites([...favorites, newItem]);
  };

  // Delete favorite
  const handleDeleteFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = favorites.filter((item) => item.id !== id);
    saveFavorites(filtered);
  };

  // Load favorite configuration
  const handleLoadFavorite = (item: FavoriteItem) => {
    setSeed(item.seed);
    setThemeKey(item.themeKey);
    setSizeKey(item.sizeKey);
    setLayout(item.layout);
    setManualAccents(item.manualAccents);
    setSelectedAccents(item.selectedAccents);
  };

  // Dimensions for layouts
  const layoutDims = {
    desktop: { w: 3840, h: 2160, label: "Desktop (4K)" },
    "iphone-portrait": { w: 1170, h: 2532, label: "iPhone Portrait" },
    "iphone-landscape": { w: 2532, h: 1170, label: "iPhone Landscape" },
  };

  const currentDims = layoutDims[layout];

  // Helper to randomize the seed
  const randomizeSeed = () => {
    const rand = Math.floor(Math.random() * 2147483647) + 1;
    setSeed(rand);
  };

  // Helper to toggle manual accent selection
  const handleAccentChipClick = (accentName: string) => {
    if (selectedAccents.includes(accentName)) {
      // Toggle off index if already selected, keeping selection distinct
      if (selectedAccents[0] === accentName) {
        setSelectedAccents([selectedAccents[1], selectedAccents[1] === "sky" ? "flamingo" : "sky"]);
      } else {
        setSelectedAccents([selectedAccents[0], selectedAccents[0] === "sky" ? "flamingo" : "sky"]);
      }
    } else {
      setSelectedAccents([selectedAccents[1], accentName]);
    }
  };

  // Trigger SVG Download with minification
  const triggerDownloadSVG = () => {
    const svgEl = document.getElementById("pattern-svg");
    if (!svgEl) return;

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgEl);

    // Minify SVG string: remove redundant spaces, trim precision, strip inter-tag spacing
    svgString = svgString
      .replace(/>\s+</g, "><") // remove whitespace between tags
      .replace(/\s+/g, " ") // normalize whitespace
      .trim();

    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = `catpattern_${seed}_${sizeKey}_${layout}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  };

  // Trigger PNG Download
  const triggerDownloadPNG = () => {
    const svgEl = document.getElementById("pattern-svg");
    if (!svgEl) return;

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgEl);

    // Replace responsive sizes with target render dimensions
    svgString = svgString.replace(/width="[^"]+"/, `width="${currentDims.w}"`);
    svgString = svgString.replace(/height="[^"]+"/, `height="${currentDims.h}"`);

    const img = new Image();
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = currentDims.w;
      canvas.height = currentDims.h;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `catpattern_${seed}_${sizeKey}_${layout}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  // View limits helper
  const halfH = 0.5;
  const halfW = halfH * (currentDims.w / currentDims.h);
  const viewBox = `${-halfW} ${-halfH} ${2 * halfW} ${2 * halfH}`;
  const scaleFactor = currentDims.h / 2160.0;
  const currentThemeObj = CATPPUCCIN_THEMES[themeKey] || CATPPUCCIN_THEMES.mocha;

  return (
    <div className="app-container">
      {/* Control Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <svg
            className="brand-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="8" />
            <path d="M12 2v20M2 12h20M5.6 5.6l12.8 12.8M5.6 18.4L18.4 5.6" />
          </svg>
          <h1 className="brand-title">Catpattern</h1>
        </div>
        <p className="brand-subtitle">Procedural Catppuccin Mandala Generator</p>

        {/* Seed Input */}
        <div className="input-group">
          <label className="input-label">Seed</label>
          <div className="input-row">
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value) || 1)}
              min="1"
              max="2147483647"
            />
            <button className="btn btn-secondary" onClick={randomizeSeed}>
              Randomize
            </button>
          </div>
        </div>

        {/* Theme Selection */}
        <div className="input-group">
          <label className="input-label">Palettes (Themes)</label>
          <div className="theme-selector">
            {Object.entries(CATPPUCCIN_THEMES).map(([key, t]) => (
              <div
                key={key}
                className={`theme-card ${themeKey === key ? "active" : ""}`}
                onClick={() => setThemeKey(key)}
              >
                <span className="theme-card-title">{t.name}</span>
                <div className="theme-card-colors">
                  <span className="color-dot" style={{ backgroundColor: t.rosewater }} />
                  <span className="color-dot" style={{ backgroundColor: t.sky }} />
                  <span className="color-dot" style={{ backgroundColor: t.mauve }} />
                  <span className="color-dot" style={{ backgroundColor: t.green }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Size Selection */}
        <div className="input-group">
          <label className="input-label">Pattern Size Scale</label>
          <select value={sizeKey} onChange={(e) => setSizeKey(e.target.value)}>
            <option value="normal">Normal (100% Area)</option>
            <option value="small">Small (50% Area)</option>
            <option value="extra-small">Extra Small (25% Area)</option>
            <option value="micro">Micro (10% Area)</option>
            <option value="nano">Nano (5% Area)</option>
          </select>
        </div>

        {/* Layout Selection */}
        <div className="input-group">
          <label className="input-label">Aspect Ratio & Layout</label>
          <div className="layout-selector">
            <div
              className={`layout-card ${layout === "desktop" ? "active" : ""}`}
              onClick={() => setLayout("desktop")}
            >
              <svg
                className="layout-card-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
              <div className="layout-card-info">
                <span className="layout-card-name">Desktop Wallpaper</span>
                <span className="layout-card-res">4K Landscape (3840 × 2160)</span>
              </div>
            </div>

            <div
              className={`layout-card ${layout === "iphone-portrait" ? "active" : ""}`}
              onClick={() => setLayout("iphone-portrait")}
            >
              <svg
                className="layout-card-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <path d="M12 18h.01" />
              </svg>
              <div className="layout-card-info">
                <span className="layout-card-name">iPhone Lockscreen</span>
                <span className="layout-card-res">Portrait (1170 × 2532)</span>
              </div>
            </div>

            <div
              className={`layout-card ${layout === "iphone-landscape" ? "active" : ""}`}
              onClick={() => setLayout("iphone-landscape")}
            >
              <svg
                className="layout-card-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ transform: "rotate(90deg)" }}
              >
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <path d="M12 18h.01" />
              </svg>
              <div className="layout-card-info">
                <span className="layout-card-name">iPhone Landscape</span>
                <span className="layout-card-res">Landscape (2532 × 1170)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Accents Selector Toggle */}
        <div className="input-group">
          <div className="manual-toggle">
            <span className="input-label" style={{ margin: 0 }}>Custom Accents</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={manualAccents}
                onChange={(e) => setManualAccents(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          {manualAccents ? (
            <div className="accents-panel">
              {ACCENTS.map((accent) => {
                const colorHex = currentThemeObj[accent as keyof CatppuccinTheme] as string;
                const isActive = selectedAccents.includes(accent);
                return (
                  <span
                    key={accent}
                    className={`accent-chip ${isActive ? "active" : ""}`}
                    style={{
                      backgroundColor: colorHex,
                      "--accent-color": colorHex,
                    } as React.CSSProperties}
                    title={accent}
                    onClick={() => handleAccentChipClick(accent)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="accent-title-box">
              <span>Auto Selected:</span>
              <span
                className="accent-badge"
                style={{
                  backgroundColor: config.accent1,
                  color: currentThemeObj.crust,
                }}
              >
                {config.accent1Name}
              </span>
              <span>+</span>
              <span
                className="accent-badge"
                style={{
                  backgroundColor: config.accent2,
                  color: currentThemeObj.crust,
                }}
              >
                {config.accent2Name}
              </span>
            </div>
          )}
        </div>

        {/* Save to Favorites Button */}
        <button className="btn" style={{ marginTop: "10px" }} onClick={handleAddToFavorites}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          Save to Favorites
        </button>

        {/* Favorites Gallery section */}
        {favorites.length > 0 && (
          <div className="favorites-section">
            <div className="favorites-header">
              <span className="favorites-header-title">Saved Gallery</span>
              <span className="favorites-count">{favorites.length}</span>
            </div>
            <div className="favorites-list">
              {favorites.map((item) => {
                const favTheme = CATPPUCCIN_THEMES[item.themeKey] || CATPPUCCIN_THEMES.mocha;
                return (
                  <div
                    key={item.id}
                    className="favorite-item"
                    onClick={() => handleLoadFavorite(item)}
                  >
                    <div className="favorite-item-content">
                      <span className="favorite-item-title">{item.name}</span>
                      <div className="favorite-item-meta">
                        <span>Seed: {item.seed}</span>
                        <span
                          className="favorite-badge"
                          style={{
                            backgroundColor: favTheme.surface0,
                            color: favTheme.text,
                          }}
                        >
                          {favTheme.name}
                        </span>
                      </div>
                    </div>
                    <button
                      className="favorite-item-delete"
                      onClick={(e) => handleDeleteFavorite(item.id, e)}
                      title="Delete favorite"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      {/* Main Workspace (Preview Area) */}
      <main className="workspace">
        {/* Responsive Preview Frame with Notch mockups */}
        <div className={`preview-frame ${layout}`}>
          {(layout === "iphone-portrait" || layout === "iphone-landscape") && (
            <div className="notch" />
          )}

          <svg
            id="pattern-svg"
            viewBox={viewBox}
            width="100%"
            height="100%"
            style={{ backgroundColor: currentThemeObj.base, display: "block" }}
          >
            {/* Draw families */}
            {config.families.map((fam, famIdx) => (
              <g key={famIdx}>
                {fam.petalPaths.map((petal, petalIdx) => {
                  const scaledLw = fam.lw / 2160.0;
                  const isThin = fam.lw * scaleFactor < 0.8;
                  return (
                    <path
                      key={petalIdx}
                      d={petal.d}
                      fill="none"
                      stroke={petal.color}
                      strokeWidth={scaledLw}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={fam.alpha}
                      shapeRendering={isThin ? "crispEdges" : "geometricPrecision"}
                    />
                  );
                })}
              </g>
            ))}

            {/* Draw central pupil */}
            <circle cx={0} cy={0} r={config.pupilR} fill={currentThemeObj.crust} />
            <circle
              cx={0}
              cy={0}
              r={config.pupilR}
              fill="none"
              stroke={lerpColor(config.accent1, config.accent2, 0.5)}
              strokeWidth={1.1 / 2160.0}
              opacity={0.55}
              shapeRendering={1.1 * scaleFactor < 0.8 ? "crispEdges" : "geometricPrecision"}
            />
          </svg>
        </div>

        {/* Toolbar for Actions */}
        <div className="toolbar">
          <button className="btn btn-secondary" onClick={triggerDownloadSVG}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download SVG
          </button>
          <button className="btn" onClick={triggerDownloadPNG}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download PNG (4K)
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;

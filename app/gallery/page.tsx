"use client";

import NextImage from "next/image";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type SyntheticEvent,
} from "react";
import { imageData, BASE_PATH } from "../lib/galleryData";

const MAX_SHAPES_DESKTOP = 5000;
const MAX_SHAPES_MOBILE = 1200;

type ViewMode = "gallery" | "color" | "main";

type AnimState = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  angle: number;
  dAngle: number;
  scaleBase: number;
  scaleAmp: number;
  phase: number;
  dPhase: number;
  scale: number;
  opacity: number;
  opacityTarget: number;
  opacityStep: number;
};

type Shape = {
  id: number;
  src: string;
  hue: number;
  animState: AnimState;
};

export default function Home() {
  const [items, setItems] = useState<string[]>(imageData);

  useEffect(() => {
    setItems((prev) => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  }, []);

  const [view, setView] = useState<ViewMode>("gallery");
  const [selectedSrc, setSelectedSrc] = useState<string | null>(null);

  const [hue, setHue] = useState(0);
  const currentColor = `hsl(${hue} 100% 50%)`;

  const scrollPosRef = useRef(0);

  const colorCacheRef = useRef<Map<string, string>>(new Map());
  const [bgColors, setBgColors] = useState<Record<string, string>>({});
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const ensureCanvas = () => {
    if (typeof window === "undefined") return null;
    if (!canvasRef.current || !ctxRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 6;
      canvas.height = 6;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      canvasRef.current = canvas;
      ctxRef.current = ctx;
    }
    return { canvas: canvasRef.current, ctx: ctxRef.current };
  };

  const computeComplement = useCallback((url: string) => {
    return new Promise<string>((resolve) => {
      if (typeof window === "undefined") return resolve("#fff");
      const assets = ensureCanvas();
      if (!assets) return resolve("#fff");
      const { canvas, ctx } = assets;
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
          let r = 0;
          let g = 0;
          let b = 0;
          const count = data.length / 4;
          for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
          }
          const avgR = Math.round(r / count);
          const avgG = Math.round(g / count);
          const avgB = Math.round(b / count);
          const comp = `rgb(${255 - avgR}, ${255 - avgG}, ${255 - avgB})`;
          resolve(comp);
        } catch {
          resolve("#fff");
        }
      };
      img.onerror = () => resolve("#fff");
      img.src = url;
    });
  }, []);

  const elementSize = 260;
  const halfSize = elementSize / 2;
  const isMobile =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("mobile") === "1" ||
        window.matchMedia("(max-width: 768px)").matches
      : false;
  const MAX_SHAPES = isMobile ? MAX_SHAPES_MOBILE : MAX_SHAPES_DESKTOP;

  const [shapes, setShapes] = useState<Shape[]>([]);
  const shapesRef = useRef<Shape[]>(shapes);

  useEffect(() => {
    shapesRef.current = shapes;
  }, [shapes]);

  const [isAuto, setIsAuto] = useState(false);
  const autoTimerRef = useRef<number | null>(null);

  const shapeElsRef = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<number | null>(null);

  const mainFont = '"Black Future", sans-serif';

  const baseButtonStyle = {
    padding: "12px 20px",
    borderRadius: 10,
    cursor: "pointer",
    color: "#000",
    fontWeight: 800,
    border: "2px solid #000",
    background: "transparent",
    fontSize: 16,
    fontFamily: mainFont,
    letterSpacing: "0.03em",
    textTransform: "none",
  };

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (typeof document === "undefined") return;
    const doc = document;

    if (!doc.fullscreenElement) {
      doc.documentElement
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      doc
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  };

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
    };
  }, []);

  function handleImageError(e: SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    if (img.dataset.errorHandled === "1") {
      img.style.opacity = "0.3";
      img.alt = "Missing / moved SVG (check path)";
      return;
    }
    img.dataset.errorHandled = "1";
    img.src = img.src.replace("/gallery/svgs-inline", BASE_PATH);
  }

  const addShapesFromSource = useCallback(
    (
      src: string,
      hueValue: number,
      initialOpacity = 0.75,
      opacityTarget = 0.75
    ) => {
      if (typeof window === "undefined") return;

      const cw = containerRef.current?.clientWidth ?? window.innerWidth;
      const ch = containerRef.current?.clientHeight ?? window.innerHeight;

      const newShapes: Shape[] = Array.from({ length: 3 }, () => {
        const usableW = Math.max(1, cw - elementSize + halfSize * 2);
        const usableH = Math.max(1, ch - elementSize + halfSize * 2);
        const startX = -halfSize + Math.random() * usableW;
        const startY = -halfSize + Math.random() * usableH;
        const speed = 2 + Math.random() * 2;
        const direction = Math.random() * 360;
        const scaleBase = 0.9 + Math.random() * 0.12;
        const scaleAmp = 0.32 + Math.random() * 0.14;
        const phase = Math.random() * Math.PI * 2;
        const dPhase = 0.008 + Math.random() * 0.008;
        const fadeAmount = Math.max(0, opacityTarget - initialOpacity);

        return {
          id: Date.now() + Math.random(),
          src,
          hue: hueValue,
          animState: {
            x: startX,
            y: startY,
            dx: speed * Math.cos((direction * Math.PI) / 180),
            dy: speed * Math.sin((direction * Math.PI) / 180),
            angle: 0,
            dAngle: (Math.random() * 2 - 1) * 2,
            scaleBase,
            scaleAmp,
            phase,
            dPhase,
            scale: scaleBase,
            opacity: initialOpacity,
            opacityTarget,
            opacityStep: fadeAmount > 0 ? 0.015 : 0,
          },
        };
      });

      setShapes((prev) => {
        const merged = [...prev, ...newShapes];
        return merged.length > MAX_SHAPES
          ? merged.slice(merged.length - MAX_SHAPES)
          : merged;
      });
    },
    [MAX_SHAPES, elementSize, halfSize]
  );

  const handleSelect = () => {
    if (!selectedSrc) return;
    addShapesFromSource(selectedSrc, hue);
    setView("main");
  };

  const selectRandomAndAdd = useCallback(() => {
    if (!items.length) return;
    const randomIndex = Math.floor(Math.random() * items.length);
    const src = items[randomIndex];
    if (!src) return;
    addShapesFromSource(src, hue, 0, 0.75);
  }, [addShapesFromSource, hue, items]);

  useEffect(() => {
    if (view !== "main" || !isAuto || !items.length) return;

    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }

    autoTimerRef.current = window.setInterval(() => {
      selectRandomAndAdd();
    }, 5000);

    return () => {
      if (autoTimerRef.current) {
        clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    };
  }, [view, isAuto, items.length, selectRandomAndAdd]);

  const autoButtonStyle = isAuto
    ? {
        color: "#fff",
        background: "#000",
      }
    : {
        color: "#000",
        background: "transparent",
      };

  useEffect(() => {
    if (view !== "main") return;
    let rafId: number;

    const tick = () => {
      const list = shapesRef.current;
      const cw = containerRef.current?.clientWidth ?? window.innerWidth;
      const ch = containerRef.current?.clientHeight ?? window.innerHeight;
      const minX = -halfSize;
      const minY = -halfSize;
      const maxX = Math.max(minX, cw - elementSize + halfSize);
      const maxY = Math.max(minY, ch - elementSize + halfSize);

      for (let i = 0; i < list.length; i++) {
        const s = list[i];
        let {
          x,
          y,
          dx,
          dy,
          angle,
          phase,
          opacity,
          opacityTarget,
          opacityStep,
        } = s.animState;
        const { dAngle, dPhase, scaleBase, scaleAmp } = s.animState;

        x += dx;
        y += dy;
        angle += dAngle;
        phase += dPhase;
        const scale = scaleBase + Math.sin(phase) * scaleAmp;

        if (opacity < opacityTarget) {
          opacity = Math.min(opacityTarget, opacity + opacityStep);
        }

        if (x <= minX || x >= maxX) {
          dx = -dx;
          x = Math.max(minX, Math.min(x, maxX));
        }

        if (y <= minY || y >= maxY) {
          dy = -dy;
          y = Math.max(minY, Math.min(y, maxY));
        }

        s.animState = {
          x,
          y,
          dx,
          dy,
          angle,
          dAngle,
          scaleBase,
          scaleAmp,
          phase,
          dPhase,
          scale,
          opacity,
          opacityTarget,
          opacityStep,
        };

        const el = shapeElsRef.current.get(s.id);
        if (el) {
          el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${angle}deg) scale(${scale})`;
          el.style.opacity = String(opacity);
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    animRef.current = rafId;

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [view, elementSize, halfSize]);

  useEffect(() => {
    if (view === "gallery") {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPosRef.current);
      });
    }
  }, [view]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    (async () => {
      for (const url of items) {
        if (cancelled) break;
        if (colorCacheRef.current.has(url)) {
          const cached = colorCacheRef.current.get(url)!;
          setBgColors((prev) => (prev[url] ? prev : { ...prev, [url]: cached }));
          continue;
        }

        const color = await computeComplement(url);
        if (cancelled) break;
        colorCacheRef.current.set(url, color);
        setBgColors((prev) => (prev[url] ? prev : { ...prev, [url]: color }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [items, computeComplement]);

  useEffect(() => {
    if (!selectedSrc || typeof window === "undefined") return;

    if (colorCacheRef.current.has(selectedSrc)) {
      const cached = colorCacheRef.current.get(selectedSrc)!;
      setBgColors((prev) =>
        prev[selectedSrc] ? prev : { ...prev, [selectedSrc]: cached }
      );
      return undefined;
    }

    let cancelled = false;

    computeComplement(selectedSrc).then((color) => {
      if (cancelled) return;
      colorCacheRef.current.set(selectedSrc, color);
      setBgColors((prev) =>
        prev[selectedSrc] ? prev : { ...prev, [selectedSrc]: color }
      );
    });

    return () => {
      cancelled = true;
    };
  }, [selectedSrc, computeComplement]);

  return (
    <main>
      <style jsx>{`
        @keyframes galleryBgFade {
          0% {
            background: #fff;
          }
          50% {
            background: #000;
          }
          100% {
            background: #fff;
          }
        }
      `}</style>

      <button
        onClick={toggleFullscreen}
        style={{
          ...baseButtonStyle,
          position: "fixed",
          top: 16,
          right: 16,
          padding: "12px 20px",
          borderRadius: 10,
          zIndex: 9999,
          background: "transparent",
          color: "#000",
          fontWeight: 800,
          fontSize: 16,
        }}
      >
        {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
      </button>

      {view === "gallery" && (
        <div
          style={{
            padding: 16,
            backgroundColor: "#000",
            minHeight: "100vh",
            color: "#eee",
            fontFamily: mainFont,
          }}
        >
          <h1
            style={{
              fontSize: 24,
              fontWeight: "bold",
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            Artwork Gallery
          </h1>

          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            }}
          >
            {items.map((url) => {
              const bg = bgColors[url] ?? "#F9F6EE";

              return (
                <button
                  key={url}
                  onClick={() => {
                    scrollPosRef.current = window.scrollY;
                    setSelectedSrc(url);
                    setHue(0);
                    setView("color");
                  }}
                  style={{
                    overflow: "hidden",
                    borderRadius: 16,
                    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.1)",
                    cursor: "pointer",
                    padding: 0,
                    background: bg,
                    border: "none",
                  }}
                  aria-label={`Select ${url}`}
                >
                  <NextImage
                    src={url}
                    alt={url}
                    width={300}
                    height={300}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      display: "block",
                    }}
                    loading="lazy"
                    onError={handleImageError}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {view === "color" && selectedSrc && (
        <div
          style={{
            backgroundColor: bgColors[selectedSrc] ?? "#F9F6EE",
            minHeight: "100vh",
            padding: 32,
            color: "#222",
            fontFamily: mainFont,
          }}
        >
          <button
            onClick={() => setView("gallery")}
            style={{
              ...baseButtonStyle,
              marginBottom: 16,
            }}
          >
            ← Back to Gallery
          </button>

          <h2
            style={{
              marginBottom: 8,
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            HUE select
          </h2>

          <div style={{ marginBottom: 16, textAlign: "center" }}>
            <input
              type="range"
              min={0}
              max={360}
              value={hue}
              onChange={(e) => setHue(parseInt(e.target.value, 10))}
              style={{ width: "100%", maxWidth: 500 }}
            />
            <div
              style={{
                marginTop: 8,
                width: 40,
                height: 20,
                borderRadius: 4,
                backgroundColor: currentColor,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            />
          </div>

          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <button
              onClick={handleSelect}
              style={{
                ...baseButtonStyle,
                background: "transparent",
              }}
            >
              Select
            </button>
          </div>

          <div
            style={{
              marginTop: 16,
              width: "100%",
              maxWidth: 780,
              aspectRatio: "1 / 1",
              maxHeight: "80vh",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            <NextImage
              src={selectedSrc}
              alt="Preview"
              width={800}
              height={800}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
                filter: `hue-rotate(${hue}deg)`,
                willChange: "filter, transform",
              }}
              onError={handleImageError}
            />
          </div>
        </div>
      )}

      {view === "main" && (
        <div
          ref={containerRef}
          style={{
            width: "100vw",
            height: "100vh",
            overflow: "hidden",
            background: "#fff",
            animation: "galleryBgFade 16s ease-in-out infinite",
            position: "relative",
          }}
        >
          <button
            onClick={() => setView("gallery")}
            style={{
              ...baseButtonStyle,
              position: "absolute",
              top: 16,
              left: 16,
              zIndex: 1000,
            }}
          >
            ← Back to Gallery
          </button>

          <button
            onClick={() => setIsAuto((prev) => !prev)}
            style={{
              ...baseButtonStyle,
              position: "absolute",
              top: 72,
              left: 16,
              zIndex: 1000,
              ...autoButtonStyle,
            }}
          >
            Auto
          </button>

          {shapes.map((shape) => (
            <div
              key={shape.id}
              ref={(el) => {
                if (el) shapeElsRef.current.set(shape.id, el);
                else shapeElsRef.current.delete(shape.id);
              }}
              style={{
                position: "absolute",
                width: elementSize,
                height: elementSize,
                willChange: "transform",
                transform: `translate3d(${shape.animState.x}px, ${shape.animState.y}px, 0) rotate(${shape.animState.angle}deg)`,
              }}
            >
              <img
                src={shape.src}
                alt="Art"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                  opacity: shape.animState.opacity,
                  filter: `hue-rotate(${shape.hue}deg)`,
                  pointerEvents: "none",
                }}
                onError={handleImageError}
              />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
"use client";

import { useRef, useEffect, type ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

const DENSITY =
  " .'`^,:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

function simpleNoise(x: number, y: number, t: number): number {
  return (
    Math.sin(x * 0.05 + t) * Math.cos(y * 0.05 + t) +
    Math.sin(x * 0.01 - t) * Math.cos(y * 0.12) * 0.5
  );
}

export function AsciiHero({ children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const charSize = 12;
    const mouse = { x: -9999, y: -9999 };
    let time = 0;
    let fid: number;

    function resize() {
      width = container!.offsetWidth;
      height = container!.offsetHeight;
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.scale(dpr, dpr);
      canvas!.style.width = width + "px";
      canvas!.style.height = height + "px";
    }

    function render() {
      ctx!.clearRect(0, 0, width, height);
      ctx!.font = `${charSize}px monospace`;
      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";

      const colsCount = Math.ceil(width / charSize);
      const rowsCount = Math.ceil(height / charSize);

      const canvasRect = canvas!.getBoundingClientRect();

      for (let y = 0; y < rowsCount; y++) {
        // Skip top ~40% — ASCII terrain fills from the bottom
        if (y < rowsCount * 0.4) continue;

        for (let x = 0; x < colsCount; x++) {
          const posX = x * charSize;
          const posY = y * charSize;

          // Mouse distance
          const dx = posX - mouse.x;
          const dy = posY - (mouse.y - canvasRect.top);
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Normalized Y (0 = bottom, 1 = top)
          const normalizedY = (rowsCount - y) / rowsCount;

          // Noise-based terrain
          const noiseVal = simpleNoise(x, y, time * 0.5);
          const mountainHeight =
            0.3 +
            Math.sin(x * 0.05 + time * 0.1) * 0.1 +
            Math.cos(x * 0.2) * 0.05;

          let char = "";
          let alpha = 0;

          // Terrain fill
          if (normalizedY < mountainHeight + noiseVal * 0.1) {
            const index = Math.floor(
              Math.abs(noiseVal) * DENSITY.length
            );
            char = DENSITY[index % DENSITY.length];
            alpha = 1 - normalizedY * 2;
          }

          // Mouse lens effect
          if (dist < 150) {
            const lensStrength = 1 - dist / 150;

            if (Math.random() > 0.5) {
              char = Math.random() > 0.5 ? "0" : "1";
              ctx!.fillStyle = `rgba(25, 25, 24, ${lensStrength})`;
            } else {
              ctx!.fillStyle = `rgba(74, 124, 111, ${alpha})`;
            }

            // Displacement toward cursor
            const shiftX = dist > 0 ? (dx / dist) * 10 * lensStrength : 0;
            const shiftY = dist > 0 ? (dy / dist) * 10 * lensStrength : 0;

            ctx!.fillText(
              char,
              posX + charSize / 2 - shiftX,
              posY + charSize / 2 - shiftY
            );
          } else if (char) {
            ctx!.fillStyle = `rgba(138, 138, 138, ${alpha})`;
            ctx!.fillText(char, posX + charSize / 2, posY + charSize / 2);
          }
        }
      }

      time += 0.01;
      fid = requestAnimationFrame(render);
    }

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    resize();
    container.addEventListener("mousemove", onMove);
    window.addEventListener("resize", resize);
    fid = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(fid);
      container.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full min-h-screen overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 pointer-events-none"
      />
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-cream to-transparent pointer-events-none z-10" />
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
          <div className="pointer-events-auto">{children}</div>
        </div>
      )}
    </div>
  );
}

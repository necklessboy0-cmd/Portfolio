"use client";

import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  r: number;
  depth: number;
  phase: number;
  speed: number;
};

type ShootingStar = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
};

export default function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let rafId = 0;
    let stars: Star[] = [];
    let shooting: ShootingStar[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const seed = () => {
      const count = Math.min(200, Math.floor((width * height) / 6500));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.5 + 0.4,
        depth: 0.35 + Math.random() * 0.65,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 1.4,
      }));
    };
    seed();

    const addShootingStar = () => {
      if (Math.random() > 0.006) return;
      const fromLeft = Math.random() > 0.5;
      shooting.push({
        x: Math.random() * width * 0.9 + (fromLeft ? width * 0.05 : 0),
        y: Math.random() * height * 0.3,
        vx: (fromLeft ? 1 : -1) * (5 + Math.random() * 6),
        vy: 3.5 + Math.random() * 3,
        life: 0,
        maxLife: 48 + Math.random() * 40,
      });
    };

    let visible = document.visibilityState === "visible";
    const onVisibility = () => {
      visible = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", onVisibility);

    const draw = (t: number) => {
      if (!visible) {
        rafId = requestAnimationFrame(draw);
        return;
      }
      ctx.clearRect(0, 0, width, height);
      const scrollY = window.scrollY;

      for (const star of stars) {
        const sy = star.y - scrollY * star.depth * 0.12;
        const wrap = ((sy % height) + height) % height;
        const twinkle =
          0.5 + 0.5 * Math.sin(t / 1000 / 1.6 * star.speed + star.phase);
        ctx.beginPath();
        ctx.arc(star.x, wrap, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${star.depth > 0.7 ? "255,255,255" : "203,213,255"},${0.35 + twinkle * 0.6})`;
        ctx.fill();
      }

      if (visible) addShootingStar();

      shooting = shooting.filter((s) => s.life < s.maxLife);
      for (const s of shooting) {
        s.x += s.vx;
        s.y += s.vy;
        s.life++;
        const fade = 1 - s.life / s.maxLife;
        const tail = 12;
        const grad = ctx.createLinearGradient(
          s.x - s.vx * tail,
          s.y - s.vy * tail,
          s.x,
          s.y,
        );
        grad.addColorStop(0, "rgba(217,70,239,0)");
        grad.addColorStop(1, `rgba(232,121,249,${0.9 * fade})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(s.x - s.vx * tail, s.y - s.vy * tail);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      }

      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);

    const onResize = () => {
      resize();
      seed();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
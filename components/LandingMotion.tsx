"use client";

import { useEffect } from "react";

export function LandingMotion() {
  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>("[data-motion]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        }
      },
      { threshold: 0.18 },
    );

    sections.forEach((section) => observer.observe(section));

    let frame = 0;
    function updateScrollProgress() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const total = document.documentElement.scrollHeight - window.innerHeight;
        const progress = total > 0 ? window.scrollY / total : 0;
        document.documentElement.style.setProperty("--scroll-progress", progress.toFixed(4));
      });
    }

    updateScrollProgress();
    window.addEventListener("scroll", updateScrollProgress, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateScrollProgress);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}

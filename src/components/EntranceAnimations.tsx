"use client";

import { useEffect } from "react";

export default function EntranceAnimations() {
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      document.querySelectorAll<HTMLElement>(".reveal, .reveal-word").forEach((el) => {
        el.classList.add("in");
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      return;
    }

    // Staggered word reveal for hero
    document.querySelectorAll<HTMLSpanElement>(".hero .word").forEach((el, i) => {
      setTimeout(() => {
        el.style.opacity = "1";
        el.style.transform = "none";
      }, 100 + i * 80);
    });

    // IntersectionObserver for scroll reveals
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            entry.target.style.opacity = "1";
            entry.target.style.transform = "none";
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    document.querySelectorAll<HTMLElement>(".reveal:not(.in), .reveal-word:not(.word)").forEach((el) => {
      observer.observe(el);
    });

    // Stagger children of .reveal containers
    document.querySelectorAll<HTMLElement>(".reveal > *").forEach((el, i) => {
      el.style.transitionDelay = `${i * 80}ms`;
    });
  }, []);

  return null;
}
'use client';

import React from 'react';

// ─── UI helpers ───────────────────────────────────────────────────────────
export const Label = ({ children, req }: { children: React.ReactNode; req?: boolean }) => (
  <label className="font-syne font-bold text-xs uppercase tracking-widest text-text-2 flex items-center gap-1">
    {children}{req && <span className="text-red">*</span>}
  </label>
);

export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`w-full bg-white border-[1.5px] border-border rounded-xl px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue focus:shadow-[0_0_0_3px_rgba(37,99,235,.1)] transition-all ${props.className || ''}`}
  />
);

export const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className={`w-full bg-white border-[1.5px] border-border rounded-xl px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue focus:shadow-[0_0_0_3px_rgba(37,99,235,.1)] transition-all resize-y ${props.className || ''}`}
  />
);

export const Section = ({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) => (
  <div className="bg-white border border-border rounded-xl shadow-sm p-6 space-y-5">
    <div className="border-b border-border pb-4">
      <h2 className="font-bebas text-3xl tracking-wide text-text">{title}</h2>
      {desc && <p className="text-text-muted text-sm mt-0.5">{desc}</p>}
    </div>
    {children}
  </div>
);

"use client";

import { useEffect, useState } from "react";
import { WELCOME_MESSAGES } from "@/lib/constants";

export function WelcomeSplash({ onDone }: { onDone: () => void }) {
  const [message] = useState(() => {
    const today = new Date().toDateString();
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
      hash = ((hash << 5) - hash + today.charCodeAt(i)) | 0;
    }
    return WELCOME_MESSAGES[Math.abs(hash) % WELCOME_MESSAGES.length];
  });
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFading(true), 1800);
    const done = setTimeout(onDone, 2300);
    return () => {
      clearTimeout(timer);
      clearTimeout(done);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-background transition-opacity duration-500 ${
        fading ? "animate-fade-out" : ""
      }`}
    >
      <div className="animate-fade-in max-w-lg px-6 text-center">
        <p className="text-2xl font-semibold leading-relaxed tracking-tight text-foreground md:text-3xl">
          {message}
        </p>
      </div>
    </div>
  );
}

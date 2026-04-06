"use client";

import { useEffect, useState } from "react";
import { WELCOME_MESSAGES } from "@/lib/constants";
import Image from "next/image";

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
    const timer = setTimeout(() => setFading(true), 2200);
    const done = setTimeout(onDone, 2700);
    return () => {
      clearTimeout(timer);
      clearTimeout(done);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070810] transition-opacity duration-500 ${
        fading ? "animate-fade-out" : ""
      }`}
    >
      <div className="animate-fade-in-scale mb-8">
        <Image
          src="/logo.svg"
          alt="Yanis Wealth"
          width={120}
          height={120}
          priority
        />
      </div>
      <p className="animate-fade-in max-w-md px-6 text-center text-xl font-medium leading-relaxed tracking-tight text-white/90"
         style={{ animationDelay: '0.3s', opacity: 0 }}>
        {message}
      </p>
    </div>
  );
}

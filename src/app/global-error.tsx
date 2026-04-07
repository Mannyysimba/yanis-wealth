"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body className="bg-[#070810] text-white">
        <div className="flex min-h-screen flex-col items-center justify-center text-center px-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/20 text-red-400 text-lg font-bold mb-6">
            !
          </div>
          <h2 className="text-xl font-bold mb-2">Erreur</h2>
          <p className="text-sm text-white/60 mb-6">
            Une erreur s&apos;est produite. Essayez de recharger.
          </p>
          <button
            onClick={reset}
            className="rounded-lg bg-[#6366F1] px-6 py-2.5 text-sm font-semibold text-white"
          >
            Recharger
          </button>
        </div>
      </body>
    </html>
  );
}

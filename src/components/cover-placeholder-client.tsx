'use client';

/* eslint-disable @next/next/no-img-element */
export function CoverPlaceholderClient({ className = '' }: { className?: string }) {
  return (
    <div className={`slash-bg flex items-center justify-center bg-ink ${className}`}>
      <img src="/brand/argos-helmet-white.png" alt="" className="h-2/5 max-h-32 w-auto opacity-90" />
    </div>
  );
}

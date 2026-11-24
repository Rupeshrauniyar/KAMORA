'use client';

import { Button } from '@/components/ui/button';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-[#FAFAF8] px-4 text-center">
      <h1 className="font-heading text-2xl font-bold text-[#11151B]">
        Something Went Wrong
      </h1>
      <p className="mt-2 max-w-md text-sm text-[#5C636E]">
        We hit an unexpected issue loading this view. Your cart and order data remain safe.
      </p>
      <Button variant="primary" className="mt-6" onClick={() => reset()}>
        Try Again
      </Button>
    </div>
  );
}

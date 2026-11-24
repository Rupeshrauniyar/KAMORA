import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-[#FAFAF8] px-4 text-center">
      <p className="font-serif text-6xl text-[#B89768]">404</p>
      <h1 className="mt-3 font-heading text-3xl font-bold text-[#11151B]">Page Not Found</h1>
      <p className="mt-2 max-w-md text-sm text-[#5C636E]">
        The page you are looking for may have moved. Explore the Kamora Adjustable Back Support
        Belt or return to our homepage.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/">
          <Button variant="primary">Back to Home</Button>
        </Link>
        <Link href="/products/back-support-belt">
          <Button variant="secondary">Shop Back Support Belt</Button>
        </Link>
      </div>
    </div>
  );
}

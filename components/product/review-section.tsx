'use client';

import * as React from 'react';
import { Star, CheckCircle2, MessageSquarePlus } from 'lucide-react';
import type { Review } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/card';
import { formatISTDate } from '@/lib/utils/format';

export function ReviewSection({
  productId,
  reviews,
  averageRating,
}: {
  productId: string;
  reviews: Review[];
  averageRating: number | null;
}) {
  const [showForm, setShowForm] = React.useState(false);
  const [rating, setRating] = React.useState(5);
  const [authorName, setAuthorName] = React.useState('');
  const [authorCity, setAuthorCity] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = React.useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setFeedback('');

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          author_name: authorName,
          author_city: authorCity,
          rating,
          title,
          body,
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setStatus('error');
        setFeedback(data.error ?? 'Could not submit your review.');
      } else {
        setStatus('success');
        setFeedback(
          data.message ??
            'Thank you! Your review has been submitted for moderation and purchase verification.'
        );
        setAuthorName('');
        setAuthorCity('');
        setTitle('');
        setBody('');
      }
    } catch {
      setStatus('error');
      setFeedback('Network error while submitting review.');
    }
  }

  return (
    <section id="reviews" className="scroll-mt-24">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono-tech text-[10px] text-[#8A9099]">
            VERIFIED EXPERIENCES
          </p>
          <h2 className="mt-2 font-heading text-3xl font-semibold tracking-[-0.03em] text-[#0E1116]">
            Honest voices,{' '}
            <span className="font-editorial italic font-normal text-[#1C3D5A]">
              zero fabricated stars.
            </span>
          </h2>
        </div>

        <Button variant="secondary" onClick={() => setShowForm((s) => !s)}>
          <MessageSquarePlus className="h-4 w-4" />
          {showForm ? 'Close Form' : 'Write a Review'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4 rounded-[22px] border border-[#E6E3DC] bg-white p-6 shadow-soft"
        >
          <div>
            <span className="font-mono-tech block text-[10px] text-[#8A9099]">RATING</span>
            <div className="mt-1.5 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`Rate ${n} out of 5`}
                  className="p-1 cursor-pointer"
                >
                  <Star
                    className={`h-6 w-6 ${
                      n <= rating ? 'fill-[#B89768] text-[#B89768]' : 'text-[#E6E3DC]'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="rev-name" className="mb-1.5 block text-xs font-semibold text-[#11151B]">
                Full Name
              </label>
              <Input
                id="rev-name"
                required
                autoComplete="name"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="rev-city" className="mb-1.5 block text-xs font-semibold text-[#11151B]">
                City (Optional)
              </label>
              <Input
                id="rev-city"
                value={authorCity}
                onChange={(e) => setAuthorCity(e.target.value)}
                placeholder="e.g. Bengaluru"
              />
            </div>
          </div>

          <div>
            <label htmlFor="rev-title" className="mb-1.5 block text-xs font-semibold text-[#11151B]">
              Headline
            </label>
            <Input
              id="rev-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarize fit and everyday comfort"
            />
          </div>

          <div>
            <label htmlFor="rev-body" className="mb-1.5 block text-xs font-semibold text-[#11151B]">
              Experience
            </label>
            <Textarea
              id="rev-body"
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share breathability, support tension, and sizing accuracy..."
            />
          </div>

          {feedback && (
            <p className={`text-sm ${status === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>
              {feedback}
            </p>
          )}

          <Button type="submit" variant="primary" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Submitting...' : 'Submit for Verification'}
          </Button>
        </form>
      )}

      {reviews.length > 0 ? (
        <div className="mt-8 space-y-6">
          {averageRating !== null && (
            <div className="flex items-center gap-4 rounded-[18px] border border-[#E6E3DC] bg-white px-6 py-4">
              <span className="font-heading text-3xl font-bold text-[#0E1116]">
                {averageRating}
              </span>
              <div>
                <div className="flex items-center gap-0.5 text-[#B89768]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.round(averageRating) ? 'fill-[#B89768]' : 'text-[#E6E3DC]'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-[#5C636E]">
                  Across {reviews.length} approved customer {reviews.length === 1 ? 'review' : 'reviews'}
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <article
                key={review.id}
                className="flex flex-col justify-between rounded-[22px] border border-[#E6E3DC] bg-white p-6"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-0.5 text-[#B89768]">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < review.rating ? 'fill-[#B89768]' : 'text-[#E6E3DC]'
                          }`}
                        />
                      ))}
                    </div>
                    {review.is_verified_purchase && (
                      <span className="font-mono-tech inline-flex items-center gap-1 text-[10px] text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        VERIFIED
                      </span>
                    )}
                  </div>
                  {review.title && (
                    <h3 className="mt-3 font-heading text-base font-semibold text-[#11151B]">
                      {review.title}
                    </h3>
                  )}
                  <p className="mt-2 text-sm leading-relaxed text-[#5C636E]">{review.body}</p>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-[#E6E3DC] pt-3.5 text-xs text-[#8A9099]">
                  <span className="font-medium text-[#11151B]">
                    {review.author_name}
                    {review.author_city ? ` · ${review.author_city}` : ''}
                  </span>
                  <span>{formatISTDate(review.created_at)}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-8 rounded-[22px] border border-[#E6E3DC] bg-white px-6 py-12 text-center">
          <p className="font-mono-tech text-[10px] text-[#B89768]">AUTHENTICITY FIRST</p>
          <p className="mt-2 font-heading text-lg font-semibold text-[#11151B]">
            Verified Reviews Publish After First Deliveries
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm text-[#5C636E]">
            Kamora strictly refuses to seed placeholder ratings. Once verified buyers submit their
            fit and comfort notes, they appear here automatically after moderation.
          </p>
        </div>
      )}
    </section>
  );
}

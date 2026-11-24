import { requireAdmin } from '@/lib/auth/admin';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { moderateReviewAction } from '@/actions/admin/mutations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatISTDate } from '@/lib/utils/format';

export default async function AdminReviewsPage() {
  await requireAdmin(['super_admin', 'admin', 'content_manager']);
  const admin = createAdminSupabaseClient();

  const { data: reviews } = await admin
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-[#11151B]">
          Customer Review Moderation ({reviews?.length ?? 0})
        </h2>
        <p className="text-xs text-[#5C636E]">
          Approve, feature, or reject genuine customer submissions. Verified-purchase badges are
          computed automatically against completed orders.
        </p>
      </div>

      {!reviews || reviews.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-[#E6E3DC] bg-white p-10 text-center text-sm text-[#5C636E]">
          No customer reviews submitted yet. Reviews will appear here for moderation as buyers
          submit them.
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="rounded-[18px] border border-[#E6E3DC] bg-white p-5 shadow-soft"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold text-[#11151B]">
                      {rev.author_name}
                    </span>
                    <Badge variant={rev.status === 'approved' ? 'success' : rev.status === 'rejected' ? 'danger' : 'warning'}>
                      {rev.status}
                    </Badge>
                    {rev.is_verified_purchase && (
                      <Badge variant="default">Verified Purchase</Badge>
                    )}
                    {rev.is_featured && <Badge variant="champagne">Featured</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-[#5C636E]">
                    Rating: {rev.rating}/5 · {formatISTDate(rev.created_at)}
                  </p>
                  {rev.title && (
                    <p className="mt-2 font-semibold text-[#11151B]">{rev.title}</p>
                  )}
                  <p className="mt-1 text-sm text-[#5C636E]">{rev.body}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <form
                    action={async (fd) => {
                      'use server';
                      await moderateReviewAction(fd);
                    }}
                  >
                    <input type="hidden" name="review_id" value={rev.id} />
                    <input type="hidden" name="status" value="approved" />
                    <input type="hidden" name="is_featured" value="true" />
                    <Button type="submit" variant="primary" size="sm">
                      Approve &amp; Feature
                    </Button>
                  </form>
                  <form
                    action={async (fd) => {
                      'use server';
                      await moderateReviewAction(fd);
                    }}
                  >
                    <input type="hidden" name="review_id" value={rev.id} />
                    <input type="hidden" name="status" value="rejected" />
                    <input type="hidden" name="is_featured" value="false" />
                    <Button type="submit" variant="secondary" size="sm">
                      Reject
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

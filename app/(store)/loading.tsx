export default function StorefrontLoading() {
  return (
    <div className="min-h-[70vh] bg-[#FAFAF8] px-4 py-12 sm:px-8">
      <div className="mx-auto max-w-[1380px] animate-pulse space-y-10">
        <div className="h-3 w-48 rounded-full bg-[#E6E3DC]" />
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-6">
            <div className="h-14 w-3/4 rounded-2xl bg-[#E6E3DC]" />
            <div className="h-14 w-1/2 rounded-2xl bg-[#E6E3DC]" />
            <div className="h-4 w-full max-w-md rounded-full bg-[#F2F0EB]" />
            <div className="h-4 w-5/6 max-w-md rounded-full bg-[#F2F0EB]" />
            <div className="flex gap-3 pt-4">
              <div className="h-12 w-44 rounded-full bg-[#E6E3DC]" />
              <div className="h-12 w-36 rounded-full bg-[#F2F0EB]" />
            </div>
          </div>
          <div className="aspect-[4/3] rounded-[28px] bg-[#F2F0EB] lg:col-span-6" />
        </div>
      </div>
    </div>
  );
}

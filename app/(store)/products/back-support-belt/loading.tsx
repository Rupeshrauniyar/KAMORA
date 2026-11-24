export default function ProductPageLoading() {
  return (
    <div className="min-h-[80vh] bg-[#FAFAF8] px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-[1380px] animate-pulse">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <div className="aspect-[4/3] w-full rounded-[26px] bg-[#F2F0EB]" />
            <div className="grid grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="aspect-[4/3] rounded-[14px] bg-[#E6E3DC]/70" />
              ))}
            </div>
          </div>
          <div className="space-y-5 lg:col-span-5">
            <div className="h-5 w-32 rounded-full bg-[#E6E3DC]" />
            <div className="h-10 w-5/6 rounded-xl bg-[#E6E3DC]" />
            <div className="h-28 w-full rounded-[22px] bg-white border border-[#E6E3DC]" />
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 rounded-[14px] bg-[#F2F0EB]" />
              ))}
            </div>
            <div className="h-13 w-full rounded-full bg-[#E6E3DC]" />
            <div className="h-13 w-full rounded-full bg-[#F2F0EB]" />
          </div>
        </div>
      </div>
    </div>
  );
}

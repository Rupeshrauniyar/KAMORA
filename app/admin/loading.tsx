export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-64 rounded-xl bg-[#E6E3DC]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-[18px] border border-[#E6E3DC] bg-white" />
        ))}
      </div>
      <div className="h-80 rounded-[20px] border border-[#E6E3DC] bg-white" />
    </div>
  );
}

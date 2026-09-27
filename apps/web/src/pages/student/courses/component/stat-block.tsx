function StatBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center rounded-xl bg-[#292382]/5 py-4">
      <span className="text-2xl font-bold text-[#292382] sm:text-3xl">{value}</span>
      <span className="text-xs text-muted-foreground sm:text-sm">{label}</span>
    </div>
  );
}

export default StatBlock
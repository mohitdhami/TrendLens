import dynamicImport from "next/dynamic";

const TrendDashboard = dynamicImport(() => import("@/components/TrendDashboard"), {
  loading: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-fog-400">
        <span className="h-2 w-2 animate-pulseSoft rounded-full bg-lime-400" />
        Calibrating signal engine…
      </div>
    </div>
  )
});

export default function Home() {
  return <TrendDashboard />;
}

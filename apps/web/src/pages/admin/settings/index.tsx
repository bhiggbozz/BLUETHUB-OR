import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader2, Video, Sparkles, AlertCircle } from "lucide-react";
import TitleBar from "@/shared/title-bar";
import { schoolFeaturesService, LIVE_CLASS_FEATURE_KEY, type SchoolFeatureDto } from "@/services/school-features";
import { AI_IMAGE_FEATURE_KEY } from "@/services/image-generation";
import { getErrorMessage } from "@/utils/errors";

interface KnownFeature {
  key: string;
  label: string;
  description: string;
  icon: typeof Video;
}

const KNOWN_FEATURES: KnownFeature[] = [
  {
    key: LIVE_CLASS_FEATURE_KEY,
    label: "Live Classes",
    description: "Lets teachers run real-time video classes with up to 3 students, from an approved lesson.",
    icon: Video,
  },
  {
    key: AI_IMAGE_FEATURE_KEY,
    label: "AI Image Generation",
    description: "Lets teachers generate illustrative images for a lesson using AI.",
    icon: Sparkles,
  },
];

const AdminSettings = () => {
  const outletContext = useOutletContext<{ openMobileNav?: () => void } | null>();
  const openMobileNav = outletContext?.openMobileNav ?? (() => {});

  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await schoolFeaturesService.list();
      const rows: SchoolFeatureDto[] = res.data.data ?? [];
      const byKey = Object.fromEntries(rows.map((r) => [r.featureKey, r.isEnabled]));
      // The list endpoint may not know about every feature yet (or may not
      // exist at all on an older backend) — fall back to checking each known
      // feature individually so a missing row never looks like "off" by mistake.
      const missing = KNOWN_FEATURES.filter((f) => !(f.key in byKey));
      if (missing.length > 0) {
        const checked = await Promise.all(
          missing.map((f) =>
            schoolFeaturesService
              .checkFeature(f.key)
              .then((r) => [f.key, r.data.data.isEnabled] as const)
              .catch(() => [f.key, false] as const)
          )
        );
        checked.forEach(([key, isEnabled]) => {
          byKey[key] = isEnabled;
        });
      }
      setFlags(byKey);
    } catch {
      // list() itself failed (e.g. not deployed yet) — fall back entirely to
      // per-feature checks rather than showing a hard error.
      try {
        const checked = await Promise.all(
          KNOWN_FEATURES.map((f) =>
            schoolFeaturesService
              .checkFeature(f.key)
              .then((r) => [f.key, r.data.data.isEnabled] as const)
              .catch(() => [f.key, false] as const)
          )
        );
        setFlags(Object.fromEntries(checked));
      } catch (err) {
        setError(getErrorMessage(err, "Could not load school feature settings."));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleToggle = async (feature: KnownFeature) => {
    const next = !flags[feature.key];
    setSavingKey(feature.key);
    try {
      await schoolFeaturesService.setFeature(feature.key, next);
      setFlags((prev) => ({ ...prev, [feature.key]: next }));
      toast.success(`${feature.label} ${next ? "turned on" : "turned off"}.`);
    } catch (err) {
      toast.error(getErrorMessage(err, `Could not update ${feature.label}.`));
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="min-h-screen font-poppins">
      <TitleBar title="School Settings" hasMenu={openMobileNav} />

      <div className="p-4 sm:p-6">
        <p className="mb-5 text-sm text-gray-500">Switch school-wide features on or off.</p>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-chestnut mb-3" />
            <p className="text-sm text-gray-500">Loading settings...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle size={28} className="mb-3 text-red-400" />
            <p className="mb-4 text-sm text-gray-600">{error}</p>
            <button onClick={load} className="rounded-xl bg-chestnut px-4 py-2 text-sm font-medium text-white hover:bg-chestnut/90">
              Try Again
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {KNOWN_FEATURES.map((feature) => {
              const isEnabled = !!flags[feature.key];
              const Icon = feature.icon;
              return (
                <div
                  key={feature.key}
                  className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 sm:p-5"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      isEnabled ? "bg-chestnut/10" : "bg-gray-100"
                    }`}
                  >
                    <Icon size={20} className={isEnabled ? "text-chestnut" : "text-gray-400"} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{feature.label}</p>
                    <p className="text-xs text-gray-400">{feature.description}</p>
                  </div>
                  <button
                    onClick={() => handleToggle(feature)}
                    disabled={savingKey === feature.key}
                    role="switch"
                    aria-checked={isEnabled}
                    aria-label={`Toggle ${feature.label}`}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                      isEnabled ? "bg-chestnut" : "bg-gray-200"
                    }`}
                  >
                    {savingKey === feature.key ? (
                      <Loader2 size={14} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
                    ) : (
                      <span
                        className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
                          isEnabled ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;

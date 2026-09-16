export type GateKey = "basicProfile" | "qualifications";

/** No-op gate — all features are open to every user regardless of profile completion. */
export async function FeatureGate({ children }: { requires: GateKey; children: React.ReactNode }) {
  return <>{children}</>;
}

import { useEffect, useState } from "react";
import { API_URL } from "../api";

type HealthState = "checking" | "ok" | "down";

export function HealthBanner() {
  const [state, setState] = useState<HealthState>("checking");

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/health`)
      .then((res) => res.json())
      .then((body: { status?: string }) => {
        if (!cancelled) setState(body.status === "ok" ? "ok" : "down");
      })
      .catch(() => {
        if (!cancelled) setState("down");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <p>API: {state === "checking" ? "…" : state}</p>;
}

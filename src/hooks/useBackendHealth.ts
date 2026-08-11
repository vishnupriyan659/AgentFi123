import { useEffect, useCallback } from "react";
import { agentApi } from "@/services/agentApi";
import { useAgentStore, type ConnectionStatus } from "@/store/useAgentStore";
import { startDemoEngine, stopDemoEngine } from "@/services/demoAgentEngine";
import { startAgentPolling, stopAgentPolling } from "@/services/agentRealtime";

export interface BackendHealthState {
  status: ConnectionStatus;
  isConnected: boolean;
  isOffline: boolean;
  isDemo: boolean;
  checkHealth: () => Promise<void>;
}

export function useBackendHealth(): BackendHealthState {
  const connectionStatus = useAgentStore((state) => state.connectionStatus);
  const setConnectionStatus = useAgentStore((state) => state.setConnectionStatus);

  const checkHealth = useCallback(async () => {
    try {
      await agentApi.healthCheck();
      setConnectionStatus("connected");
      startAgentPolling();
      stopDemoEngine();
    } catch {
      if (import.meta.env.VITE_ENABLE_DEMO_FALLBACK === "true") {
        setConnectionStatus("demo");
        startDemoEngine();
      } else {
        setConnectionStatus("offline");
      }
    }
  }, [setConnectionStatus]);

  useEffect(() => {
    let mounted = true;

    async function runInitialCheck() {
      if (!mounted) return;
      setConnectionStatus("connecting");
      try {
        await agentApi.healthCheck();
        if (!mounted) return;
        setConnectionStatus("connected");
        startAgentPolling();
        stopDemoEngine();
      } catch {
        if (!mounted) return;
        if (import.meta.env.VITE_ENABLE_DEMO_FALLBACK === "true") {
          setConnectionStatus("demo");
          startDemoEngine();
        } else {
          setConnectionStatus("offline");
        }
      }
    }

    runInitialCheck();

    const interval = setInterval(runInitialCheck, 15000);

    return () => {
      mounted = false;
      clearInterval(interval);
      stopAgentPolling();
      stopDemoEngine();
    };
  }, [setConnectionStatus]);

  return {
    status: connectionStatus || "connecting",
    isConnected: connectionStatus === "connected",
    isOffline: connectionStatus === "offline" || connectionStatus === "error",
    isDemo: connectionStatus === "demo",
    checkHealth,
  };
}

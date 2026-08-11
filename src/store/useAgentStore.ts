import { create } from "zustand";
import { AgentId, AgentStatus, AgentState, AgentActivity } from "@/types/agents";

export type ConnectionStatus = "connected" | "connecting" | "demo" | "offline" | "error";

export interface DemoSession {
  id: string;
  isActive: boolean;
  walletAddress: string;
  simulatedBalanceSol: number;
  startedAt: string;
}

interface AgentStore {
  // Network / Global
  connectionStatus: ConnectionStatus;
  activeAgents: number;
  tasksRunning: number;
  successRate: number;
  systemLoad: number;
  lastSyncTime: number;

  // Agents Map
  agents: Record<AgentId, AgentState>;

  // Activity Feed
  activityHistory: AgentActivity[];

  // Intent Flow state
  currentIntentId: string | null;
  currentIntentSummary: string | null;

  // Demo Session
  demoSession: DemoSession | null;
  startDemoSession: () => void;
  exitDemoSession: () => void;

  // Actions
  setConnectionStatus: (status: ConnectionStatus) => void;
  setAgentStatus: (id: AgentId, status: AgentStatus) => void;
  setAgentProgress: (id: AgentId, progress: number) => void;
  setAgentConfidence: (id: AgentId, confidence: number) => void;
  setAgentTask: (id: AgentId, task: string, message?: string) => void;
  completeAgentTask: (id: AgentId, message: string, confidence?: number) => void;
  failAgentTask: (id: AgentId, error: string) => void;
  
  hydrateFromBackend: (data: Partial<AgentStore>) => void;
  addActivity: (activity: Omit<AgentActivity, "id" | "timestamp">) => void;
  resetAgents: () => void;
  startIntent: (intentId: string, summary: string) => void;
  
  // Internal updates
  _updateGlobalMetrics: () => void;
}

const initialAgents: Record<AgentId, AgentState> = {
  planner: { id: "planner", name: "Planner Agent", status: "idle", confidence: 99, progress: 0, currentTask: "Awaiting Intent", message: "", lastUpdated: new Date().toISOString() },
  risk: { id: "risk", name: "Risk Agent", status: "idle", confidence: 100, progress: 0, currentTask: "Monitoring", message: "", lastUpdated: new Date().toISOString() },
  market: { id: "market", name: "Market Agent", status: "idle", confidence: 95, progress: 0, currentTask: "Scanning Liquidity", message: "", lastUpdated: new Date().toISOString() },
  execution: { id: "execution", name: "Execution Agent", status: "idle", confidence: 100, progress: 0, currentTask: "Standby", message: "", lastUpdated: new Date().toISOString() },
  portfolio: { id: "portfolio", name: "Portfolio Agent", status: "idle", confidence: 98, progress: 0, currentTask: "Tracking Assets", message: "", lastUpdated: new Date().toISOString() },
  recommendation: { id: "recommendation", name: "Recommendation Agent", status: "idle", confidence: 92, progress: 0, currentTask: "Scanning Ops", message: "", lastUpdated: new Date().toISOString() },
  health: { id: "health", name: "Health Agent", status: "idle", confidence: 100, progress: 0, currentTask: "Monitoring Vitals", message: "", lastUpdated: new Date().toISOString() }
};

const getInitialDemoSession = (): DemoSession | null => {
  if (typeof window === "undefined") return null;
  const stored = sessionStorage.getItem("agentfi_demo_session");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return null;
    }
  }
  return null;
};

export const useAgentStore = create<AgentStore>((set, get) => ({
  connectionStatus: getInitialDemoSession() ? "demo" : "connecting",
  activeAgents: 0,
  tasksRunning: 0,
  successRate: 0,
  systemLoad: 0,
  lastSyncTime: Date.now(),
  agents: { ...initialAgents },
  activityHistory: [],
  currentIntentId: null,
  currentIntentSummary: null,
  demoSession: getInitialDemoSession(),

  startDemoSession: () => {
    const session: DemoSession = {
      id: crypto.randomUUID(),
      isActive: true,
      walletAddress: "DEMO_WALLET_AGENTFI_123",
      simulatedBalanceSol: 10.0,
      startedAt: new Date().toISOString()
    };
    sessionStorage.setItem("agentfi_demo_session", JSON.stringify(session));
    set({ demoSession: session, connectionStatus: "demo" });
  },

  exitDemoSession: () => {
    sessionStorage.removeItem("agentfi_demo_session");
    set({ demoSession: null, connectionStatus: "connecting" });
  },

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  setAgentStatus: (id, status) => {
    set((state) => ({
      agents: {
        ...state.agents,
        [id]: { ...state.agents[id], status, lastUpdated: new Date().toISOString() }
      }
    }));
    get()._updateGlobalMetrics();
  },

  setAgentProgress: (id, progress) => {
    set((state) => ({
      agents: {
        ...state.agents,
        [id]: { ...state.agents[id], progress, lastUpdated: new Date().toISOString() }
      }
    }));
  },

  setAgentConfidence: (id, confidence) => {
    set((state) => ({
      agents: {
        ...state.agents,
        [id]: { ...state.agents[id], confidence, lastUpdated: new Date().toISOString() }
      }
    }));
  },

  setAgentTask: (id, task, message = "") => {
    set((state) => ({
      agents: {
        ...state.agents,
        [id]: { ...state.agents[id], currentTask: task, message, lastUpdated: new Date().toISOString() }
      }
    }));
  },

  completeAgentTask: (id, message, confidence) => {
    set((state) => ({
      agents: {
        ...state.agents,
        [id]: { 
          ...state.agents[id], 
          status: "completed", 
          progress: 100, 
          message,
          confidence: confidence ?? state.agents[id].confidence,
          lastUpdated: new Date().toISOString() 
        }
      }
    }));
    get()._updateGlobalMetrics();
  },

  failAgentTask: (id, error) => {
    set((state) => ({
      agents: {
        ...state.agents,
        [id]: { ...state.agents[id], status: "failed", error, lastUpdated: new Date().toISOString() }
      }
    }));
    get()._updateGlobalMetrics();
  },

  hydrateFromBackend: (data) => {
    set((state) => ({ ...state, ...data, lastSyncTime: Date.now() }));
  },

  addActivity: (activity) => {
    set((state) => ({
      activityHistory: [
        { ...activity, id: crypto.randomUUID(), timestamp: new Date().toISOString() },
        ...state.activityHistory
      ].slice(0, 100) // keep last 100
    }));
  },

  resetAgents: () => {
    set({ agents: { ...initialAgents }, tasksRunning: 0, currentIntentId: null, currentIntentSummary: null });
  },

  startIntent: (intentId, summary) => {
    set({ currentIntentId: intentId, currentIntentSummary: summary });
    get().addActivity({ type: "intent", title: "Intent Received", message: `"${summary}"`, status: "info" });
  },

  _updateGlobalMetrics: () => {
    const agents = Object.values(get().agents);
    const tasks = agents.filter(a => a.status === "analyzing" || a.status === "working").length;
    set({ tasksRunning: tasks });
  }
}));

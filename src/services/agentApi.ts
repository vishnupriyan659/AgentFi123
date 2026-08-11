const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

class AgentApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "AgentApiError";
  }
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    
    if (!response.ok) {
      throw new AgentApiError(`API Error: ${response.statusText}`, response.status);
    }
    
    return await response.json();
  } catch (err: any) {
    clearTimeout(id);
    if (err.name === 'AbortError') throw new AgentApiError("Request timed out", 408);
    throw new AgentApiError(err.message || "Network error");
  }
}

export const agentApi = {
  healthCheck: () => fetchWithTimeout(`${API_BASE_URL}/health`, {}, 3000),
  getAgentNetworkState: () => fetchWithTimeout(`${API_BASE_URL}/agents/state`),
  getAgentActivity: () => fetchWithTimeout(`${API_BASE_URL}/agents/activity`),
  
  submitIntent: (payload: { intent: string, wallet: string }) => 
    fetchWithTimeout(`${API_BASE_URL}/intents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }),

  getIntentStatus: (intentId: string) => fetchWithTimeout(`${API_BASE_URL}/intents/${intentId}`),
  
  validateTransfer: (payload: {
    rawIntent: string;
    action: string;
    token: string;
    network: string;
    sender: string;
    recipient: string;
    amount: string;
  }) => fetchWithTimeout(`${API_BASE_URL}/transfers/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }),

  simulateIntent: (intentId: string, payload: any) => 
    fetchWithTimeout(`${API_BASE_URL}/intents/${intentId}/simulate`, { 
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }),
  
  prepareTransaction: (intentId: string, payload: any) => 
    fetchWithTimeout(`${API_BASE_URL}/intents/${intentId}/prepare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }),
    
  submitTransactionResult: (intentId: string, signature: string, status: string) => 
    fetchWithTimeout(`${API_BASE_URL}/intents/${intentId}/result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signature, status })
    }),
    
  getTransaction: (signature: string) => fetchWithTimeout(`${API_BASE_URL}/transactions/${signature}`),

  copilotChat: (message: string, walletAddress?: string) =>
    fetchWithTimeout(`${API_BASE_URL}/copilot/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, walletAddress })
    })
};

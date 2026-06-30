export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface CognifyRequest {
  datasets: string[];
}

export interface RecallRequest {
  query: string;
  datasets: string[];
  searchType: "GRAPH_COMPLETION";
}

// The API returns an array of result objects; we extract the top answer text.
export interface RecallResultItem {
  id: string;
  text: string;
  score?: number;
}

export type RecallResponse = RecallResultItem[];

export class CogneeError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "CogneeError";
  }
}

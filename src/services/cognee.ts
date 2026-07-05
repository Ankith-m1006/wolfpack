import * as FileSystem from "expo-file-system/legacy";
import config from "../config";
import {
  CogneeError,
  LoginResponse,
  RecallRequest,
  RecallResponse,
  RecallResult,
  RecallSource,
} from "../types/cognee";

let authToken: string | null = null;


async function authedFetch(
  path: string,
  init: RequestInit,
  retry = true,
): Promise<Response> {
  const res = await fetch(`${config.API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (res.status === 401 && retry) {

    authToken = null;
    await login();
    return authedFetch(path, init, false);
  }

  return res;
}

export async function login(email?: string, password?: string): Promise<void> {
  const body = new URLSearchParams({
    username: email ?? config.AUTH_EMAIL,
    password: password ?? config.AUTH_PASSWORD,
  });

  const res = await fetch(`${config.API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new CogneeError(`Login failed: ${res.statusText}`, res.status);
  }

  const data: LoginResponse = await res.json();
  authToken = data.access_token;
}

async function ensureLoggedIn(): Promise<void> {
  if (!authToken) {
    await login();
  }
}

function formatCaptureTimestamp(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export async function remember(text: string): Promise<void> {
  await ensureLoggedIn();
  console.log('[cognee] remember: starting /remember');

  const contextualText = `[Captured on ${formatCaptureTimestamp(new Date())}]: ${text}`;

  const filename = `memory_${Date.now()}.txt`;
  const tempUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(tempUri, contextualText, { encoding: "utf8" });

  const formData = new FormData();
  formData.append('data', { uri: tempUri, type: 'text/plain', name: filename } as unknown as Blob);
  formData.append('datasetName', config.DEFAULT_DATASET);

  const res = await authedFetch('/api/v1/remember', { method: 'POST', body: formData });
  const body = await res.text().catch(() => '');
  console.log('[cognee] /remember status:', res.status, 'body:', body);
  if (!res.ok) throw new CogneeError(`Remember failed: ${res.statusText}`, res.status);
}

export async function rememberPhoto(localUri: string): Promise<void> {
  await ensureLoggedIn();
  console.log('[cognee] rememberPhoto: starting /remember');

  const filename = `photo_${Date.now()}.jpg`;
  const formData = new FormData();
  formData.append('data', { uri: localUri, type: 'image/jpeg', name: filename } as unknown as Blob);
  formData.append('datasetName', config.DEFAULT_DATASET);

  const res = await authedFetch('/api/v1/remember', { method: 'POST', body: formData });
  const body = await res.text().catch(() => '');
  console.log('[cognee] rememberPhoto /remember status:', res.status, 'body:', body);
  if (!res.ok) throw new CogneeError(`Remember photo failed: ${res.statusText}`, res.status);
}



const EVIDENCE_LINE_RE = /document\s+(\S+).*?:\s*"([^"]*)"\s*$/;

function parseRecallText(raw: string): RecallResult {
  const marker = "Evidence:";
  const markerIndex = raw.indexOf(marker);

  if (markerIndex === -1) {
    return { answer: raw.trim(), sources: [] };
  }

  const answer = raw.slice(0, markerIndex).trim();
  const evidenceBlock = raw.slice(markerIndex + marker.length);

  const sources: RecallSource[] = [];
  for (const line of evidenceBlock.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(EVIDENCE_LINE_RE);
    if (!match) continue;

    sources.push({ documentName: match[1].trim(), text: match[2].trim() });
  }

  return { answer, sources };
}

export async function recall(query: string): Promise<RecallResult> {
  await ensureLoggedIn();
  console.log('[cognee] recall: starting /recall');

  const body: RecallRequest = {
    query,
    datasets: [config.DEFAULT_DATASET],
    searchType: "GRAPH_COMPLETION",
    includeReferences: true,
  };

  const res = await authedFetch("/api/v1/recall", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  console.log('[cognee] /recall status:', res.status);
  if (!res.ok) {
    const body = await res.text();
    throw new CogneeError(`Recall failed ${res.status}: ${body}`, res.status);
  }

  const data: RecallResponse = await res.json();
  console.log('[cognee] /recall raw response:', JSON.stringify(data));
  return parseRecallText(data[0]?.text ?? "");
}

export type FragmentType = 'photo' | 'text';

export type Fragment = {
  id: string;
  name: string;
  type: FragmentType;
  createdAt: Date;
  preview: string;
};

export type GraphNode = {
  id: string;
  label: string;
  type: string;
  properties: Record<string, unknown>;
};

export type GraphEdge = {
  source: string;
  target: string;
  label: string;
};

export type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export async function getGraph(): Promise<GraphData> {
  await ensureLoggedIn();
  const res = await authedFetch(`/api/v1/datasets/${config.DEFAULT_DATASET_ID}/graph`, {
    method: 'GET',
  });
  if (!res.ok) throw new CogneeError(`Failed to get graph: ${res.statusText}`, res.status);
  return res.json() as Promise<GraphData>;
}

export async function listFragments(): Promise<Fragment[]> {
  await ensureLoggedIn();

  const res = await authedFetch(`/api/v1/datasets/${config.DEFAULT_DATASET_ID}/data`, {
    method: 'GET',
  });
  if (!res.ok) throw new CogneeError(`Failed to list fragments: ${res.statusText}`, res.status);

  const items: Array<{ id: string; name: string; createdAt: string; mimeType: string }> = await res.json();
  const sorted = [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const fragments = await Promise.all(
    sorted.map(async (item): Promise<Fragment> => {
      const type: FragmentType = item.name.startsWith('photo_') ? 'photo' : 'text';
      let preview = '';

      if (type === 'text') {
        try {
          const raw = await authedFetch(
            `/api/v1/datasets/${config.DEFAULT_DATASET_ID}/data/${item.id}/raw`,
            { method: 'GET' },
          );
          if (raw.ok) {
            const text = await raw.text();
            preview = text.replace(/<!--.*?-->/gs, '').trim().slice(0, 120);
          }
        } catch {
        }
      }

      return { id: item.id, name: item.name, type, createdAt: new Date(item.createdAt), preview };
    }),
  );

  return fragments;
}

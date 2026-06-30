import * as FileSystem from "expo-file-system/legacy";
import config from "../config";
import {
  CogneeError,
  CognifyRequest,
  LoginResponse,
  RecallRequest,
  RecallResponse,
} from "../types/cognee";

let authToken: string | null = null;

// Wraps fetch with the bearer token; retries once on 401 by re-logging in.
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
    // Token expired or invalidated — refresh and try once more.
    authToken = null;
    await login();
    return authedFetch(path, init, false);
  }

  return res;
}

export async function login(): Promise<void> {
  const body = new URLSearchParams({
    username: config.AUTH_EMAIL,
    password: config.AUTH_PASSWORD,
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

export async function remember(text: string): Promise<void> {
  await ensureLoggedIn();
  console.log('[cognee] remember: starting /add');

  // React Native fetch can't serialize a Blob in FormData — write to a temp
  // file and use a file:// URI instead, which RN handles correctly.
  // Unique filename prevents Cognee from skipping cognify as "already completed".
  const filename = `memory_${Date.now()}.txt`;
  const tempUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(tempUri, text, { encoding: "utf8" });

  const formData = new FormData();
  formData.append("files", { uri: tempUri, type: "text/plain", name: filename } as unknown as Blob);
  formData.append("datasetName", config.DEFAULT_DATASET);

  const addRes = await authedFetch("/api/v1/add", {
    method: "POST",
    body: formData,
  });

  console.log('[cognee] /add status:', addRes.status);
  // Drain the body so the connection is released cleanly.
  await addRes.text().catch(() => {});
  if (!addRes.ok) {
    throw new CogneeError(`Failed to add memory: ${addRes.statusText}`, addRes.status);
  }

  console.log('[cognee] remember: starting /cognify');
  const cognifyBody: CognifyRequest = { datasets: [config.DEFAULT_DATASET] };

  const cognifyRes = await authedFetch("/api/v1/cognify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cognifyBody),
  });

  console.log('[cognee] /cognify status:', cognifyRes.status);
  const cognifyBody2 = await cognifyRes.text().catch(() => '');
  console.log('[cognee] /cognify body:', cognifyBody2);
  if (!cognifyRes.ok) {
    throw new CogneeError(`Cognify failed ${cognifyRes.status}: ${cognifyBody2}`, cognifyRes.status);
  }
}

export async function recall(query: string): Promise<string> {
  await ensureLoggedIn();
  console.log('[cognee] recall: starting /recall');

  const body: RecallRequest = {
    query,
    datasets: [config.DEFAULT_DATASET],
    searchType: "GRAPH_COMPLETION",
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

  // Return the top result's text, or empty string if nothing came back.
  return data[0]?.text ?? "";
}

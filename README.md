# 🐺 Wolfpack

**Your life. Connected. Remembered.**

Wolfpack is an AI memory companion built for the **WeMakeDevs × Cognee Hackathon "The Hangover Part AI."** It captures the messy fragments of your day or night voice notes, photos, locations, quick text and uses a **self-hosted [Cognee](https://github.com/topoteretes/cognee)** knowledge graph to connect them. Ask it anything afterward, and it answers from across your captured memories, not just a single note.

> Built for **Track 1: Best Use of Cognee Open Source**

---

## 📱 Try it now

| | |
|---|---|
| **Live app (Android APK)** | [Download Wolfpack.apk](https://github.com/Ankith-m1006/wolfpack/releases/download/v1.0.0/wolfpack.apk) |
| **Landing page** | `https://wolfpack-dun.vercel.app` |
| **Demo video (3 min)** | [Watch on YouTube](https://youtu.be/iblp05lh6d4) |
| **Live backend (Railway)** | `https://wolfpack-backend-production.up.railway.app` |
| **Backend repo** | [wolfpack-backend](https://github.com/Ankith-m1006/wolfpack-backend) |

> **Note:** If Chrome blocks the APK download, open the link in Firefox or another browser instead this is a known Chrome/Android restriction on browser-downloaded APKs, not an issue with the file itself.
>
> **iOS:** Not available yet. Shipping an iOS build requires an Apple Developer signing certificate, which isn't available through this project's build pipeline (EAS/Expo can produce an Android APK without one, but iOS distribution requires Apple's paid program). Android only for this submission.

---

## ✨ What it does

Wolfpack has four screens, each mapped to a real memory operation:

### 📷 Capture
One button, four ways to remember:
- **Hold to record** a voice note transcribed on-device, no cloud STT needed
- **Photo** snap anything; Cognee's vision model describes it automatically (no manual OCR step)
- **Place** one tap pins your current location, reverse-geocoded to a readable address
- **Type** a quick text note when that's faster

Every capture is invisible-by-design: tap, done, back to your day. No forms, no tagging, no friction.

### 💬 Ask
A chat interface over your own memories. Ask things like *"Who was I with last night?"* or *"What did I spend at Mirage?"* Wolfpack doesn't just search for keywords, it traverses the knowledge graph Cognee built from your fragments and answers with facts that may span multiple captures.

Every answer includes a **"Sources Used"** section the exact fragment(s) it reasoned from, so the answer is inspectable, not a black box.

### 🗂️ Memory
A day-grouped list of every real fragment you've captured voice, photo, location, text each with a live preview pulled straight from Cognee's storage.

### 🕸️ Reconstruct
A visual timeline of your day built from real graph data: fragments in chronological order, with the entities Cognee extracted (people, places, events) shown as connector chips beneath each card. Includes a **"Memory Completeness"** meter a playful score (0–100%) reflecting how much of the day's story is actually filled in, with gentle nudges like *"No photos captured today"* when something's missing.

---

## 🏗️ Architecture

```
┌─────────────────┐     HTTPS      ┌──────────────────────┐
│  React Native    │ ─────────────▶│   Self-hosted Cognee   │
│  (Expo) app       │                │   (Docker, on Railway) │
└─────────────────┘                └──────────────────────┘
                                              │
                                    ┌─────────┴─────────┐
                                    │                   │
                              OpenAI gpt-4o-mini   Gemini embeddings
                              (text + vision)      (gemini-embedding-001)
```

- **Frontend:** React Native, Expo, TypeScript (strict), `expo-router` for navigation
- **Backend:** Self-hosted Cognee, containerized with Docker, deployed on Railway
- **LLM:** OpenAI `gpt-4o-mini` handles text reasoning, entity extraction, and image description
- **Embeddings:** Google Gemini `gemini-embedding-001` (3072 dimensions)
- **Voice:** On-device speech recognition (`expo-speech-recognition`) no audio ever leaves the phone unprocessed
- **Location:** `expo-location` with reverse geocoding
- **Photos:** `expo-image-picker` images sent directly to Cognee, described natively by its built-in vision loader

**Single-file-of-truth rule:** every backend call in the app goes through one file `src/services/cognee.ts`. No screen talks to Cognee directly. This kept the entire capture pipeline swappable (mock data → real endpoints → local backend → Railway) without touching UI code once, across the whole build.

---

## 🧠 How Cognee is used

Wolfpack uses Cognee's core memory lifecycle directly, not just as a vector store:

| Verb | Used for |
|---|---|
| **`remember()`** | Every captured fragment (text, transcribed voice, location string, photo) is ingested and structured into the graph in a single call. Each fragment is automatically timestamped (`[Captured on July 5, 2026]: ...`) so relative time references "today," "tonight" resolve correctly when queried later. |
| **`recall()`** | Powers the Ask screen. Uses `GRAPH_COMPLETION` search with `includeReferences: true`, which returns both a natural-language answer *and* the exact source fragments (document name, chunk text) it reasoned from surfaced to the user as "Sources Used." |
| **Graph API** (`/datasets/{id}/graph`) | Powers the Reconstruct screen. Rather than a flat list, this pulls the real entities and relationships Cognee's extraction produced e.g. `had_coffee_with`, `located_in`, `is_friends_with` and renders them as connected timeline cards. |
| **`improve()` / `forget()`** | Implemented and tested at the API level (confirmed working via manual testing). Not yet wired into the app UI noted here as a transparent limitation rather than glossed over. |

**A real example from development:** two separate captures *"My name is Pahwa, I prefer Python"* and *"I had coffee with Sarah at Blue Tokai today"* were made in different sessions. Asking *"What happened at Blue Tokai?"* returned: **"The speaker had coffee with Sarah."** Neither fragment alone contained that full sentence Cognee's graph connected them. This cross-fragment reasoning is the core thing Wolfpack demonstrates.

---

## 🛠️ Running it yourself

### Run the app

```bash
git clone https://github.com/Ankith-m1006/wolfpack.git
cd wolfpack
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `a` for an Android emulator. By default it points at the hosted Railway backend no setup needed.

### Run your own backend (self-hosted)

```bash
git clone https://github.com/Ankith-m1006/wolfpack-backend.git
cd wolfpack-backend
```

Create a `.env` file in the project root:

```dotenv
# ---- LLM ----
LLM_PROVIDER="openai"
LLM_MODEL="openai/gpt-4o-mini"
LLM_API_KEY="your-openai-api-key"

# ---- Embeddings ----
EMBEDDING_PROVIDER="gemini"
EMBEDDING_MODEL="gemini/gemini-embedding-001"
EMBEDDING_DIMENSIONS="3072"
EMBEDDING_API_KEY="your-gemini-api-key"

# ---- Misc ----
COGNEE_SKIP_CONNECTION_TEST="true"
```

> Get an OpenAI key at [platform.openai.com](https://platform.openai.com) and a Gemini key at [aistudio.google.com](https://aistudio.google.com).

Start it:

```bash
docker compose up -d
curl http://localhost:8000/health
# {"status":"ready","health":"healthy"}
```

Full interactive API docs live at `http://localhost:8000/docs`.

Then point the app at your local backend edit `src/config.ts`:

```ts
API_BASE_URL: "http://<your-machine-IP>:8000"
```

Use your machine's LAN IP (via `ipconfig`/`ifconfig`), not `localhost`, if testing on a physical phone over Wi-Fi.

---

## 📦 Tech stack

| Layer | Technology |
|---|---|
| Mobile app | React Native, Expo, TypeScript |
| Navigation | expo-router |
| Voice capture | On-device speech recognition (`expo-speech-recognition`) |
| Location capture | `expo-location` |
| Photo capture | `expo-image-picker` |
| Memory engine | [Cognee](https://github.com/topoteretes/cognee) (self-hosted) |
| LLM | OpenAI `gpt-4o-mini` |
| Embeddings | Google Gemini `gemini-embedding-001` |
| Backend hosting | Railway |
| Containerization | Docker |
| App build | EAS (Expo Application Services) |

---

## 🧩 Known limitations (transparent by design)

- **`improve()` and `forget()`** are proven working at the API level but not yet exposed in the app UI (e.g. no delete/dedupe button on the Memory screen yet).
- **iOS build** is not available requires Apple Developer signing, out of scope for this submission's build pipeline.
- **Reconstruct's connector lines** are simplified (straight/curved, not true bezier paths) a deliberate scope decision to prioritize correct data grouping over pixel-perfect visual curves given the hackathon timeline.
- **The completeness meter** and **Sources Used** feature are genuinely computed from real Cognee data (not mocked), but the underlying scoring formula (fragment variety + count + entity presence) is a simple heuristic, not a Cognee-native feature.

---

## 🏆 Hackathon submission

- **Track:** Best Use of Cognee Open Source
- **Self-hosted:** The production Cognee instance is entirely self-hosted (Docker container on Railway) no use of Cognee Cloud anywhere in this project.
- **AI-assisted development:** Built with the assistance of Claude (Anthropic) used throughout for architecture, debugging, and feature development.

---

## 🙏 Acknowledgements

Built for the **WeMakeDevs × Cognee Hackathon**, July 2026.
Powered by [Cognee](https://www.cognee.ai) the open-source memory engine that makes the whole thing possible.
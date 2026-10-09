import type { ImageProvider, LlmProvider, MusicProvider, ProviderRegistry, TtsProvider, VideoProvider } from "@media-studio/core";
import { AnthropicLlmProvider } from "./anthropic";
import { PROVIDER_CATALOG, PROVIDER_ENV, type ProviderKind } from "./catalog";
import { ElevenLabsTtsProvider } from "./elevenlabs";
import { configError } from "./errors";
import { FalVideoProvider } from "./fal";
import { GoogleImageProvider, GoogleMusicProvider, GoogleTtsProvider, GoogleVideoProvider } from "./google";
import { MinimaxVideoProvider } from "./minimax";
import { MockImageProvider, MockLlmProvider, MockMusicProvider, MockTtsProvider, MockVideoProvider } from "./mock";
import { XaiVideoProvider } from "./xai";

export interface ProviderRegistryOptions {
  env?: Record<string, string | undefined>;
  fetch?: typeof fetch;
}

export interface ProviderCatalogEntry {
  kind: ProviderKind;
  provider: string;
  model: string;
  label: string;
  configured: boolean;
  notes: string;
}

export interface ProviderCatalogRegistry extends ProviderRegistry {
  catalog(): ProviderCatalogEntry[];
  /** Whether a provider id is registered for a kind (has its API key, or is "mock"). */
  has(kind: ProviderKind, id: string): boolean;
}

type Maps = {
  llm: Map<string, LlmProvider>;
  image: Map<string, ImageProvider>;
  video: Map<string, VideoProvider>;
  tts: Map<string, TtsProvider>;
  music: Map<string, MusicProvider>;
};

function isConfigured(provider: string, env: Record<string, string | undefined>): boolean {
  const required = PROVIDER_ENV[provider];
  if (!required) return false;
  return required.every((k) => Boolean(env[k]?.trim()));
}

/**
 * Real providers are registered only when their API key (and base URL where needed) is present;
 * "mock" is always available so the whole pipeline can run offline at $0.
 */
export function createProviderRegistry(opts: ProviderRegistryOptions = {}): ProviderCatalogRegistry {
  const env = opts.env ?? process.env;
  const fetchImpl = opts.fetch;
  const maps: Maps = { llm: new Map(), image: new Map(), video: new Map(), tts: new Map(), music: new Map() };

  maps.llm.set("mock", new MockLlmProvider());
  maps.image.set("mock", new MockImageProvider());
  maps.video.set("mock", new MockVideoProvider());
  maps.tts.set("mock", new MockTtsProvider());
  maps.music.set("mock", new MockMusicProvider());

  if (isConfigured("anthropic", env)) {
    maps.llm.set("anthropic", new AnthropicLlmProvider({ apiKey: env.ANTHROPIC_API_KEY!, fetch: fetchImpl }));
  }
  if (isConfigured("google", env)) {
    const g = { apiKey: env.GEMINI_API_KEY!, fetch: fetchImpl };
    maps.image.set("google", new GoogleImageProvider(g));
    maps.tts.set("google", new GoogleTtsProvider(g));
    maps.music.set("google", new GoogleMusicProvider(g));
    maps.video.set("google", new GoogleVideoProvider(g));
  }
  if (isConfigured("minimax", env)) {
    maps.video.set("minimax", new MinimaxVideoProvider({ apiKey: env.MINIMAX_API_KEY!, baseUrl: env.MINIMAX_API_BASE!, fetch: fetchImpl }));
  }
  if (isConfigured("xai", env)) {
    maps.video.set("xai", new XaiVideoProvider({ apiKey: env.XAI_API_KEY!, fetch: fetchImpl }));
  }
  if (isConfigured("fal", env)) {
    maps.video.set("fal", new FalVideoProvider({ apiKey: env.FAL_KEY!, fetch: fetchImpl }));
  }
  if (isConfigured("elevenlabs", env)) {
    maps.tts.set("elevenlabs", new ElevenLabsTtsProvider({ apiKey: env.ELEVENLABS_API_KEY!, fetch: fetchImpl }));
  }

  function get<K extends keyof Maps>(kind: K, id: string): Maps[K] extends Map<string, infer P> ? P : never {
    const provider = maps[kind].get(id);
    if (!provider) {
      const keys = PROVIDER_ENV[id];
      const hint = keys ? `set ${keys.join(" and ")}` : "unknown provider id";
      throw configError(id, `${kind} provider "${id}" is not configured (${hint})`);
    }
    return provider as Maps[K] extends Map<string, infer P> ? P : never;
  }

  return {
    llm: (id) => get("llm", id),
    image: (id) => get("image", id),
    video: (id) => get("video", id),
    tts: (id) => get("tts", id),
    music: (id) => get("music", id),
    has: (kind, id) => maps[kind].has(id),
    catalog: () =>
      PROVIDER_CATALOG.map((m) => ({ ...m, configured: maps[m.kind].has(m.provider) })),
  };
}

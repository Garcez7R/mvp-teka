type RuntimeEnv = Record<string, unknown>;

const RUNTIME_ENV_KEY = "__TEKA_RUNTIME_ENV__";

export function setRuntimeEnv(env: RuntimeEnv | undefined) {
  if (!env || typeof env !== "object") return;
  const current = (globalThis as any)[RUNTIME_ENV_KEY] ?? {};
  (globalThis as any)[RUNTIME_ENV_KEY] = { ...current, ...env };
}

export function getRuntimeEnvValue(name: string): string | undefined {
  const runtimeEnv = (globalThis as any)[RUNTIME_ENV_KEY] as
    | Record<string, unknown>
    | undefined;
  const runtimeValue = runtimeEnv?.[name];
  if (typeof runtimeValue === "string" && runtimeValue.trim()) {
    return runtimeValue;
  }

  if (typeof process !== "undefined" && process?.env?.[name]) {
    return process.env[name];
  }

  return undefined;
}


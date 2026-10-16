// 全局响应式状态：GUIState 快照 + 派生 UI 状态。
// 绑定调用返回的就是普通 JSON 对象（键名与 Go json tag 一致），
// 类型经 GUIState 约束即可，无需生成类的 createFrom 水合。
import { reactive, computed } from "vue";
import { bindings } from "./api";
import type { GUIState, OpenCodeWindowView } from "./api";

export type Provider = "glm" | "opencode";

export const store = reactive({
  state: null as GUIState | null,
  sampleBusy: false,
  ocSampleBusy: false, // OpenCode Go 探测进行中
  ocError: "", // OpenCode Go 最近一次探测错误（人类可读）
  ocFocusToken: false, // 空状态「前往设置」时聚焦 OpenCode Token 输入框
  tab: "dashboard" as "dashboard" | "history" | "settings",
});

export const isDemo = computed(() => store.state?.mode === "demo");
export const hasToken = computed(() => store.state?.config?.has_token === true);

// ---- Provider ----
export const activeProvider = computed<Provider>(
  () => (store.state?.active_provider === "opencode" ? "opencode" : "glm"),
);
// OpenCode 暗色 console 视图生效条件：仪表盘页 + OpenCode Provider
export const isOpenCodeView = computed(
  () => store.tab === "dashboard" && activeProvider.value === "opencode",
);

// ---- OpenCode Go ----
export const ocHasToken = computed(() => store.state?.opencode_config?.has_token === true);
export const ocWindows = computed<OpenCodeWindowView[]>(
  () => store.state?.opencode_status?.windows ?? [],
);

export async function refreshState(): Promise<void> {
  store.state = (await bindings.GetState()) as GUIState;
}

export async function sampleNow(): Promise<void> {
  if (store.sampleBusy) return;
  store.sampleBusy = true;
  try {
    await bindings.SampleNow();
    // 成功结果经 "status" 事件回流（runtime.onSample 广播），此处无需处理
  } catch (e) {
    console.error("sample failed:", e);
    await refreshState().catch(() => undefined);
  } finally {
    store.sampleBusy = false;
  }
}

export async function setActiveProvider(p: Provider): Promise<void> {
  if (p === activeProvider.value) return;
  try {
    await bindings.SetActiveProvider(p);
  } finally {
    // 结果经 "provider-changed" 事件回流，此处兜底刷新
    await refreshState().catch(() => undefined);
  }
}

// sampleOpenCodeNow 立即探测一次 OpenCode Go（真实网络，不落历史）。
export async function sampleOpenCodeNow(): Promise<void> {
  if (store.ocSampleBusy) return;
  store.ocSampleBusy = true;
  store.ocError = "";
  try {
    await bindings.SampleOpenCodeNow();
    // 成功结果经 "opencode-status" 事件回流
    await refreshState().catch(() => undefined);
  } catch (e) {
    store.ocError = errText(e);
    await refreshState().catch(() => undefined);
  } finally {
    store.ocSampleBusy = false;
  }
}

// goOpenCodeSettings 跳转设置页并请求聚焦 OpenCode Token 输入框。
export function goOpenCodeSettings(): void {
  store.ocFocusToken = true;
  store.tab = "settings";
}

export function errText(e: unknown): string {
  const s = String(e ?? "");
  const i = s.indexOf(": ");
  return i > 0 ? s.slice(i + 2) : s;
}

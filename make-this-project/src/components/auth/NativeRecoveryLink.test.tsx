import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addListener: vi.fn(),
  getLaunchUrl: vi.fn(),
  completeNativeRecovery: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@capacitor/app", () => ({
  App: { addListener: mocks.addListener, getLaunchUrl: mocks.getLaunchUrl },
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true },
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
}));
vi.mock("@/lib/recovery-link", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/recovery-link")>()),
  completeNativeRecovery: mocks.completeNativeRecovery,
}));

import { NativeRecoveryLink } from "./NativeRecoveryLink";

describe("NativeRecoveryLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.addListener.mockResolvedValue({ remove: vi.fn() });
    mocks.completeNativeRecovery.mockResolvedValue(true);
  });

  it("handles a recovery link that launched a closed app", async () => {
    const link =
      "alertaagua://auth/redefinir-senha#access_token=abc&refresh_token=xyz&type=recovery";
    mocks.getLaunchUrl.mockResolvedValue({ url: link });

    render(<NativeRecoveryLink />);

    await waitFor(() => expect(mocks.completeNativeRecovery).toHaveBeenCalledWith(link));
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/redefinir-senha", replace: true });
  });

  it("handles a link while the app is open only once", async () => {
    mocks.getLaunchUrl.mockResolvedValue(undefined);
    let onOpen: ((event: { url: string }) => void) | undefined;
    mocks.addListener.mockImplementation((_event, handler) => {
      onOpen = handler;
      return Promise.resolve({ remove: vi.fn() });
    });

    render(<NativeRecoveryLink />);
    const link = "alertaagua://auth/redefinir-senha?code=one-time-code";
    onOpen?.({ url: link });
    onOpen?.({ url: link });

    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledOnce());
    expect(mocks.completeNativeRecovery).toHaveBeenCalledOnce();
    expect(mocks.completeNativeRecovery).toHaveBeenCalledWith(link);
  });
});

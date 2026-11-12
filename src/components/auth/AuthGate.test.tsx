import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthGate } from "./AuthGate";

const mock = vi.hoisted(() => ({
  getSession: vi.fn(),
  navigate: vi.fn(),
  authCallback: null as null | ((event: string, session: unknown) => void),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mock.navigate,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: mock.getSession,
      onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
        mock.authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mock.authCallback = null;
});

describe("AuthGate", () => {
  it("keeps the dashboard hidden until a saved session is checked", async () => {
    let resolveSession!: (value: unknown) => void;
    mock.getSession.mockReturnValue(
      new Promise((resolve) => {
        resolveSession = resolve;
      }),
    );

    render(
      <AuthGate pathname="/">
        <div>Painel</div>
      </AuthGate>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Verificando sessão...");
    expect(screen.queryByText("Painel")).not.toBeInTheDocument();

    await act(async () => {
      resolveSession({ data: { session: { user: { id: "user-1" } } }, error: null });
    });

    expect(screen.getByText("Painel")).toBeInTheDocument();
    expect(mock.navigate).not.toHaveBeenCalled();
  });

  it("sends a signed-out visitor to login without showing the dashboard", async () => {
    mock.getSession.mockResolvedValue({ data: { session: null }, error: null });

    render(
      <AuthGate pathname="/">
        <div>Painel</div>
      </AuthGate>,
    );

    await waitFor(() =>
      expect(mock.navigate).toHaveBeenCalledWith({ to: "/login", replace: true }),
    );
    expect(screen.queryByText("Painel")).not.toBeInTheDocument();
  });

  it("hides the dashboard and redirects when the session ends", async () => {
    mock.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });

    render(
      <AuthGate pathname="/">
        <div>Painel</div>
      </AuthGate>,
    );
    expect(await screen.findByText("Painel")).toBeInTheDocument();

    act(() => mock.authCallback?.("SIGNED_OUT", null));

    expect(screen.queryByText("Painel")).not.toBeInTheDocument();
    expect(mock.navigate).toHaveBeenCalledWith({ to: "/login", replace: true });
  });

  it("shows public pages without checking a session", () => {
    render(
      <AuthGate pathname="/login">
        <div>Entrar</div>
      </AuthGate>,
    );

    expect(screen.getByText("Entrar")).toBeInTheDocument();
    expect(mock.getSession).not.toHaveBeenCalled();
  });
});

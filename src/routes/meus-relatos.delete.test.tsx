import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MeusRelatosPage } from "./meus-relatos";

const mock = vi.hoisted(() => ({
  getSession: vi.fn(),
  deleteOccurrence: vi.fn(),
  useOccurrences: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  Link: ({ children }: { children: React.ReactNode }) => <a href="#">{children}</a>,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: mock.getSession,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

vi.mock("@/services/occurrences", () => ({
  deleteOccurrence: mock.deleteOccurrence,
  useOccurrences: mock.useOccurrences,
}));

const report = {
  id: "occ-1",
  userId: "author-1",
  autor: "author@example.com",
  titulo: "Rua alagada",
  endereco: "Rua A",
  descricao: "Água na rua",
  tipo: "alagamento",
  gravidade: "moderado",
  status: "ativa",
  confirmacoesAtiva: 0,
  confirmacoesNormalizada: 0,
  createdAt: new Date().toISOString(),
  lastActivityAt: Date.now(),
  closesAt: Date.now() + 3600000,
};

beforeEach(() => {
  vi.clearAllMocks();
  mock.getSession.mockResolvedValue({
    data: { session: { user: { id: "author-1", email: "author@example.com" } } },
  });
  mock.useOccurrences.mockReturnValue([report]);
  mock.deleteOccurrence.mockResolvedValue(undefined);
});

describe("MeusRelatosPage deletion", () => {
  it("asks for confirmation and removes the report from the list after deletion", async () => {
    render(<MeusRelatosPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Excluir" }));

    expect(screen.getByText("Excluir relato?")).toBeInTheDocument();
    expect(mock.deleteOccurrence).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Excluir relato" }));

    await waitFor(() => expect(mock.deleteOccurrence).toHaveBeenCalledWith("occ-1"));
    await waitFor(() => expect(screen.getByText("0 relato(s)")).toBeInTheDocument());
    expect(mock.useOccurrences).toHaveBeenCalledWith(1);
    expect(screen.queryByText("Rua alagada")).not.toBeInTheDocument();
  });

  it("does not offer deletion for a report owned by another account", async () => {
    mock.useOccurrences.mockReturnValue([{ ...report, userId: "other-user" }]);
    render(<MeusRelatosPage />);

    expect(await screen.findByText("Rua alagada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument();
  });
});

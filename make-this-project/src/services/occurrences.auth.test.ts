import { describe, expect, it } from "vitest";
import { assertLoggedInUser } from "./occurrences";

describe("assertLoggedInUser", () => {
  it("lança erro quando não há usuário autenticado", () => {
    expect(() => assertLoggedInUser(null)).toThrow("Você precisa estar logado para registrar ou confirmar um incidente.");
  });

  it("retorna o usuário quando ele está autenticado", () => {
    const user = { id: "user-1", email: "teste@teste.com" } as any;
    expect(assertLoggedInUser(user)).toBe(user);
  });
});

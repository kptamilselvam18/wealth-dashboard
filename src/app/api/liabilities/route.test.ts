import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
const mocks = vi.hoisted(() => ({ auth: vi.fn(), findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() }))
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }))
vi.mock("@/lib/prisma", () => ({ prisma: { liability: mocks } }))
import { GET, POST, PATCH, DELETE } from "./route"
const debt = { name: "Home loan", type: "HOME_LOAN", outstandingAmount: 100, interestRate: 8, emi: 10 }
const request = (method: string, body?: unknown, query = "") => new NextRequest(`http://localhost/api/liabilities${query}`, { method, ...(body ? { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } } : {}) })
beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue({ user: { id: "user-a" } }) })
describe("debt record access", () => {
  it("requires authentication", async () => {
    mocks.auth.mockResolvedValue(null)
    expect((await GET()).status).toBe(401)
    expect((await POST(request("POST", debt))).status).toBe(401)
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it("scopes edits to the signed-in owner", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 })
    expect((await PATCH(request("PATCH", { ...debt, id: "other-users-debt" }))).status).toBe(404)
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "other-users-debt", userId: "user-a" } }))
  })
  it("scopes deletion to the signed-in owner", async () => {
    mocks.deleteMany.mockResolvedValue({ count: 0 })
    expect((await DELETE(request("DELETE", undefined, "?id=other-users-debt"))).status).toBe(404)
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { id: "other-users-debt", userId: "user-a" } })
  })
  it("rejects invalid data before database writes", async () => {
    expect((await POST(request("POST", { ...debt, outstandingAmount: -1 }))).status).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it("assigns new records to the session rather than a submitted user id", async () => {
    mocks.create.mockResolvedValue({ id: "new-debt" })
    expect((await POST(request("POST", { ...debt, userId: "user-b" }))).status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith({ data: { ...debt, userId: "user-a" } })
  })
})

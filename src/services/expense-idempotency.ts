// Axios stores a serialized JSON body on retries. Preserve both data and key.
export function expenseMutationData(data: unknown, createId: () => string) {
  const body: unknown = typeof data === "string" ? JSON.parse(data) : data;
  if (!body || typeof body !== "object" || Array.isArray(body)) return data;
  const expense = body as Record<string, unknown>;
  return { ...expense, clientMutationId: expense.clientMutationId || createId() };
}

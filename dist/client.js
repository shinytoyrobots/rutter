/**
 * Which host client wrote a captured record (docs/client-label-plan.md).
 *
 * A HOST client, never a model: `agy` runs Gemini and Claude models, and Claude
 * Code can run others, and no hook payload carries the model. The label is
 * metadata -- it never touches summary or stance text -- and absent beats wrong:
 * every case the rules below cannot settle gets no label.
 *
 * Stored records hold a plain string (session-record.ts), so a future client or a
 * hand-edited value never makes a day unreadable. The canonical set is enforced
 * here, where the label is PRODUCED.
 */
export const CLIENTS = ["claude", "grok", "codex", "agy", "copilot", "muse"];
export function isClient(value) {
    return typeof value === "string" && CLIENTS.includes(value);
}
export function parseExplicitIdentity(raw) {
    if (raw === undefined || raw === "")
        return { kind: "absent" };
    return isClient(raw) ? { kind: "client", client: raw } : { kind: "unrecognized" };
}
/**
 * Decide the label from the ORIGINAL envelope's shape and the explicit identity.
 * Must run before Antigravity normalization, which discards exactly the fields
 * that identify it. A label comes back only for a pair in the table below.
 *
 *   explicit \ shape | none    | agy  | grok | copilot
 *   absent           | none    | agy  | grok | copilot
 *   claude           | claude  | none | grok | none     (Grok runs the Claude plugin's hook)
 *   grok             | grok    | none | grok | none
 *   codex            | codex   | none | none | none
 *   agy              | agy     | agy  | none | none
 *   copilot          | copilot | none | none | copilot
 *   muse             | muse    | none | none | none
 *
 * claude x copilot is a conflict, not the Grok exception: no probe has shown Copilot
 * running the Claude plugin's hook, so it gets no label until one does.
 *
 * Contradictory shape (more than one of agy, grok, copilot), a direct payload, and an
 * unrecognized explicit identity all yield no label.
 *
 * `last_assistant_message` is deliberately not an input: Claude, Codex and Muse all
 * send it, so it separates nothing. Codex and Muse are explicit-only for the same reason.
 */
export function classifyClient(shape, explicit) {
    if (shape.direct)
        return undefined;
    if (explicit.kind === "unrecognized")
        return undefined;
    if (Number(shape.agy) + Number(shape.grok) + Number(shape.copilot) > 1)
        return undefined;
    const id = explicit.kind === "client" ? explicit.client : undefined;
    if (shape.copilot)
        return id === undefined || id === "copilot" ? "copilot" : undefined;
    if (shape.agy)
        return id === undefined || id === "agy" ? "agy" : undefined;
    if (shape.grok)
        return id === undefined || id === "claude" || id === "grok" ? "grok" : undefined;
    return id;
}
//# sourceMappingURL=client.js.map
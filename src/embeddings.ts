/**
 * Embedding client port. Stubbed at S1 (ADR-6): the interface exists so the
 * search-tool contract does not change when local Ollama (`nomic-embed-text`)
 * embeddings + brute-force cosine similarity are wired in at H2. There is no
 * vector index in the walking skeleton — FTS5 keyword search only.
 */
export interface EmbeddingClient {
  embed(text: string): Promise<number[]>;
}

export class NotImplementedEmbeddingClient implements EmbeddingClient {
  async embed(): Promise<number[]> {
    throw new Error("Embeddings are not implemented in the S1 walking skeleton (see ADR-6).");
  }
}

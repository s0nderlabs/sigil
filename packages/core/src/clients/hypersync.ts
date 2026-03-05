export type HypersyncTransaction = {
  blockNumber: number;
  transactionIndex: number;
  hash: string;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  timestamp: number;
};

interface HypersyncResponse {
  data: Array<{
    transactions?: Array<{
      block_number: number;
      transaction_index: number;
      hash: string;
      from: string;
      to?: string;
      value?: string;
      gas_used?: string;
    }>;
    blocks?: Array<{
      number: number;
      timestamp: number;
    }>;
  }>;
  archive_height: number;
  next_block: number;
}

export async function queryTransactionHistory(
  address: string,
  fromBlock?: number
): Promise<{ transactions: HypersyncTransaction[]; totalCount: number }> {
  const ENDPOINT = "https://sepolia.hypersync.xyz/query";
  const TOKEN = process.env.HYPERSYNC_TOKEN;

  const normalizedAddress = address.toLowerCase();
  const transactions: HypersyncTransaction[] = [];
  let currentFromBlock = fromBlock || 0;
  let pageCount = 0;
  const MAX_PAGES = 100;

  while (pageCount < MAX_PAGES) {
    pageCount++;

    const resp = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      },
      body: JSON.stringify({
        from_block: currentFromBlock,
        transactions: [
          { from: [normalizedAddress] },
          { to: [normalizedAddress] },
        ],
        include_all_blocks: false,
        field_selection: {
          transaction: [
            "block_number",
            "transaction_index",
            "hash",
            "from",
            "to",
            "value",
            "gas_used",
          ],
          block: ["number", "timestamp"],
        },
      }),
    });

    if (!resp.ok) throw new Error(`HyperSync error: ${resp.status}`);
    const result: HypersyncResponse = await resp.json();

    for (const batch of result.data) {
      const blocks = new Map<number, number>();
      for (const b of batch.blocks ?? []) {
        blocks.set(b.number, b.timestamp);
      }

      for (const tx of batch.transactions ?? []) {
        transactions.push({
          blockNumber: tx.block_number,
          transactionIndex: tx.transaction_index,
          hash: tx.hash,
          from: tx.from,
          to: tx.to ?? "",
          value: tx.value ?? "0",
          gasUsed: tx.gas_used ?? "0",
          timestamp: blocks.get(tx.block_number) ?? 0,
        });
      }
    }

    currentFromBlock = result.next_block;
    if (result.next_block >= result.archive_height) break;
  }

  return {
    transactions,
    totalCount: transactions.length,
  };
}

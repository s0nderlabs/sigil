// Agent B (Assessor) — SDK wiring
// Creates MCP server from @sigil/core Agent B tools (smart server with state tracking)
// Uses createSdkMcpServer() + tool() from Agent SDK
// Custom tools: 7 (get_eth_balance, get_token_balance, get_transaction_history,
//   check_contract_code, check_sanctions, get_validation_history, pin_evidence)
// Built-in tools: WebFetch, WebSearch (fallback only)
// NOT given: Bash, Read, Write, Edit, Glob, Grep
export {}; // TODO

export const SEPOLIA_ADDRESSES = {
  identityRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
  reputationRegistry: "0x8004B663056A597Dffe9eCcC1965A193B7388713",
  validationRegistry: "0x8004Cb1BF31DAf7788923b405b754f57acEB4272",
  sigilMiddleware: "0x2A1F759EC07d1a4177f845666dA0a6d82c37c11f",
  sigilDemo: "0xec1EbB23162888bE120f66Fc7341239256F1c473",
  creSimulationForwarder: "0x15fC6ae953E024d975e77382eEeC56A9101f9F88",
  creTestnetForwarder: "0xF8344CFd5c43616a4366C34E3EEE75af79a74482",
  // Sigil's own 8004 agents — set after running dev/0-register-sigil-agents.sh
  scribeAgentId: "2223",
  assessorAgentId: "2224",
} as const;

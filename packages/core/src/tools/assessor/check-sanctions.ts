import { z } from "zod";
import { type ToolDefinition, toolResponse } from "../types.js";

// Known OFAC-sanctioned addresses (Tornado Cash + notable sanctioned entities)
const SANCTIONED_ADDRESSES = new Set(
  [
    // Tornado Cash contracts
    "0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b",
    "0xd96f2B1c14Db8458374d9Aca76E26c3D18364307",
    "0x4736dCf1b7A3d580672CcE6E7c65cd5cc9cFBfA9",
    "0xDD4c48C0B24039969fC16D1cdF626eaB821d3384",
    "0xd47438C816c9E7f2E2888E060936a499Af9582b3",
    "0x910Cbd523D972eb0a6f4cAe4618aD62622b39DbF",
    "0xA160cdAB225685dA1d56aa342Ad8841c3b53f291",
    "0xFD8610d20aA15b7B2E3Be39B396a1bC3516c7144",
    "0x07687e702b410Fa43f4cB4Af7FA097918ffD2730",
    "0x23773E65ed146A459791799d01336DB287f25334",
    "0x22aaA7720ddd5388A3c0A3333430953C68f1849b",
    "0xBA214C1c1928a32Bffe790263E38B4Af9bFCD659",
    "0xb1C8094B234DcE6e03f10a5b673c1d8C69739A00",
    "0x527653eA119F3E6a1F5BD18fbF4714081D7B31ce",
    "0x58E8dCC13BE9780fC42E8723D8EaD4CF46943dF2",
    "0x8589427373D6D84E98730D7795D8f6f8731FDA16",
    "0x715CdDa5e9Ad30A0cEd14940F9997EE611496De6",
    "0xD691F27f38B395864Ea86CfC7253969B409c362d",
    "0xaEaaC358560e11f52454D997AAFF2c5731B6f8a6",
    "0x1356c899D8C9467C7f71C195612F8A395aBf2f0a",
    "0xA7e5d5A720f06526557c513402f2e6B5fA20b008",
    "0x6Bf694a291DF3FeC1f7e69701E3ab6c592435Ae7",
    "0x12D66f87A04A9E220743712cE6d9bB1B5616B8Fc",
    "0x47CE0C6eD5B0Ce3d3A51fdb1C52DC66a7c3c2936",
    "0x23173fE8b96A4Ad8d2E17fB83EA5dcccdCa1Ae52",
    "0xD4B88Df4D29F5CedD6857912842cff3b20C8Cfa3",
    "0x610B717796ad172B316836AC95a2ffad065CeaB4",
    "0x178169B423a011fff22B9e3F3abeA13571f90Ec3",
    "0xbB93e510BbCD0B7beb5A853875f9eC60275CF498",
    "0x2717c5e28cf931f659205106c1d4F0FcA9f7e68b",
  ].map((a) => a.toLowerCase())
);

export const checkSanctions: ToolDefinition = {
  name: "check_sanctions",
  description:
    "Check if an Ethereum address appears on the OFAC sanctions list (SDN). Uses a static known-bad list since Chainalysis Oracle is mainnet-only.",
  inputSchema: z.object({
    address: z.string().describe("Ethereum address to check"),
  }),
  handler: async (args) => {
    const sanctioned = SANCTIONED_ADDRESSES.has(args.address.toLowerCase());
    return toolResponse({ sanctioned, source: "ofac-sdn-list" });
  },
};

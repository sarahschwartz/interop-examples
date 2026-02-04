import { sepolia } from "viem/chains";
import { createConfig, http } from "wagmi";

import { CHAIN_A, CHAIN_B, zksyncOsTestnet } from "./constants";

export const config = createConfig({
  chains: [sepolia, zksyncOsTestnet, CHAIN_A, CHAIN_B],
  transports: {
    [sepolia.id]: http(),
    [zksyncOsTestnet.id]: http(),
    [CHAIN_A.id]: http(),
    [CHAIN_B.id]: http(),
  },
});

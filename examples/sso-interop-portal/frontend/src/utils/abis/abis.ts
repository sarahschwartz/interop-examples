export const I_L1_MESSENGER_ABI = [
  {
    type: "function",
    name: "sendToL1",
    inputs: [{ name: "_message", type: "bytes" }],
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "nonpayable",
  },
];

export const INTEROP_ROOT_STORAGE_ABI = [
  {
    type: "function",
    name: "interopRoots",
    inputs: [
      { name: "chainId", type: "uint256" },
      { name: "batchNumber", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
  },
];

export const MESSAGE_VERIFICATION_ABI = [
  {
    type: "function",
    name: "proveL2MessageInclusionShared",
    inputs: [
      { name: "chainId", type: "uint256" },
      { name: "batchNumber", type: "uint256" },
      { name: "index", type: "uint256" },
      {
        name: "message",
        type: "tuple",
        components: [
          { name: "txNumberInBatch", type: "uint16" },
          { name: "sender", type: "address" },
          { name: "data", type: "bytes" },
        ],
      },
      { name: "proof", type: "bytes32[]" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
];

export const L2_BASE_TOKEN_ABI = [
  {
    type: "function",
    name: "withdraw",
    inputs: [{ name: "l1Receiver", type: "address" }],
    outputs: [],
    stateMutability: "payable",
  },
];

// export const NATIVE_TOKEN_VAULT_ABI = [
//   "function assetId(address _tokenAddress) view returns (bytes32)",
//   "function ensureTokenIsRegistered(address _nativeToken) returns (bytes32)",
//   "function tokenAddress(bytes32 _assetId) view returns (address)",
// ];

// export const INTEROP_CENTER_ABI = [
//   "function sendBundle(bytes calldata _destinationChainId, tuple(bytes to, bytes data, bytes[] callAttributes)[] calldata _callStarters, bytes[] calldata _bundleAttributes) external payable returns (bytes32)",
// ];

// export const INTEROP_HANDLER_ABI = [
//   "function executeBundle(bytes memory _bundle, tuple(uint256 chainId, uint256 l1BatchNumber, uint256 l2MessageIndex, tuple(uint16 txNumberInBatch, address sender, bytes data) message, bytes32[] proof) memory _proof) external",
// ];

export const NATIVE_TOKEN_VAULT_ABI = [
  {
    type: "function",
    name: "assetId",
    stateMutability: "view",
    inputs: [{ name: "_tokenAddress", type: "address" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "ensureTokenIsRegistered",
    stateMutability: "nonpayable",
    inputs: [{ name: "_nativeToken", type: "address" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "tokenAddress",
    stateMutability: "view",
    inputs: [{ name: "_assetId", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

export const INTEROP_CENTER_ABI = [
  {
    type: "function",
    name: "sendBundle",
    stateMutability: "payable",
    inputs: [
      { name: "_destinationChainId", type: "bytes" },
      {
        name: "_callStarters",
        type: "tuple[]",
        components: [
          { name: "to", type: "bytes" },
          { name: "data", type: "bytes" },
          { name: "callAttributes", type: "bytes[]" },
        ],
      },
      { name: "_bundleAttributes", type: "bytes[]" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
] as const;

export const INTEROP_HANDLER_ABI = [
  {
    type: "function",
    name: "executeBundle",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_bundle", type: "bytes" },
      {
        name: "_proof",
        type: "tuple",
        components: [
          { name: "chainId", type: "uint256" },
          { name: "l1BatchNumber", type: "uint256" },
          { name: "l2MessageIndex", type: "uint256" },
          {
            name: "message",
            type: "tuple",
            components: [
              { name: "txNumberInBatch", type: "uint16" },
              { name: "sender", type: "address" },
              { name: "data", type: "bytes" },
            ],
          },
          { name: "proof", type: "bytes32[]" },
        ],
      },
    ],
    outputs: [],
  },
] as const;

export const BUNDLE_ABI = [
  {
    type: "tuple",
    components: [
      { name: "version", type: "bytes1" },
      { name: "sourceChainId", type: "uint256" },
      { name: "destinationChainId", type: "uint256" },
      { name: "interopBundleSalt", type: "bytes32" },
      {
        name: "calls",
        type: "tuple[]",
        components: [
          { name: "version", type: "bytes1" },
          { name: "shadowAccount", type: "bool" },
          { name: "to", type: "address" },
          { name: "from", type: "address" },
          { name: "value", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
      },
      {
        name: "bundleAttributes",
        type: "tuple",
        components: [
          { name: "executionAddress", type: "bytes" },
          { name: "unbundlerAddress", type: "bytes" },
        ],
      },
    ],
  },
];
export const INTEROP_BUNDLE_SENT_EVENT_ABI = [
  {
    type: "event",
    name: "InteropBundleSent",
    inputs: [
      { name: "l2l1MsgHash", type: "bytes32", indexed: false },
      { name: "interopBundleHash", type: "bytes32", indexed: false },
      {
        name: "interopBundle",
        type: "tuple",
        components: [
          { name: "version", type: "bytes1" },
          { name: "sourceChainId", type: "uint256" },
          { name: "destinationChainId", type: "uint256" },
          { name: "interopBundleSalt", type: "bytes32" },
          {
            name: "calls",
            type: "tuple[]",
            components: [
              { name: "version", type: "bytes1" },
              { name: "shadowAccount", type: "bool" },
              { name: "to", type: "address" },
              { name: "from", type: "address" },
              { name: "value", type: "uint256" },
              { name: "data", type: "bytes" },
            ],
          },
          {
            name: "bundleAttributes",
            type: "tuple",
            components: [
              { name: "executionAddress", type: "bytes" },
              { name: "unbundlerAddress", type: "bytes" },
            ],
          },
        ],
      },
    ],
  },
] as const;

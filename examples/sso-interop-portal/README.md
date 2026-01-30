# SSO Interop Portal

This example shows how to implement:

- L1 <-> L2 interop to deposit and withdraw ETH into Aave
- creating ZKsync SSO passkey-based accounts tied to a single domain
- sending basic ETH transfers using a passkey for authentication
- sending bundled transactions via the ZKsync SSO bundler
- (Optional) L2 <-> L2 interop for sending ERC20 tokens and arbitrary messages
  between chains

## How it works

There are three folders included in this project:

1. `frontend`: contains a React frontend for the portal.
1. `backend`: responsible for finalizing Aave deposit and withdrawal
   transactions on the L1, tracking the status of those transactions, deploying
   SSO accounts, and sending testnet funds to the user's account.
1. `token-contract`: contains a Hardhat project with a smart contract for a test
   USD token. This is only used if running the project with local L2 <-> L2
   interop.

More details can be found in the respective folder's `README.md` files.

## Running locally

## Prerequisites

You must have [`bun`](https://bun.com/docs/installation) installed to run the basic app without L2 <-> L2 interop.

To run the full app including L2 <-> L2 interop,
you must also install the latest versions of
`anvil` via [`foundry`](https://getfoundry.sh/introduction/installation),
and [Rust](https://rust-lang.org/tools/install/).

### Basic setup (without L2 <-> L2 interop)

#### Fund your testnet wallet

You will need a wallet with some [testnet ETH](https://docs.zksync.io/zksync-network/zksync-era/ecosystem/network-faucets#sepolia-faucets)
on sepolia and some testnet ETH on the ZKsync OS testnet.
Follow the [bridging instructions](https://docs.zksync.io/zksync-network/zksync-os/network-details#bridging-testnet-eth)
in the ZKsync docs to bridge some testnet ETH from sepolia to ZKsync OS testnet.
Make sure to leave some funds on sepolia as well.

#### Setup the backend environment variables

Inside the `backend` folder create a new `.env` file.
Use the `.env.example` file as a guide for your `.env`.

#### Run the backend

Install the backend dependencies with:

```bash
cd examples/sso-interop-portal/backend
bun install
```

Then start the server with:

```bash
bun dev
```

#### Run the frontend

Open another terminal to run the frontend app.
Install the dependencies with:

```bash
cd examples/sso-interop-portal/frontend
bun install
```

Then start the app with:

```bash
bun dev
```

### Running with L2 <-> L2 interop

#### Setup local chains for interop testing

Clone the ZKsync OS server repository:

```bash
git clone https://github.com/matter-labs/zksync-os-server.git
```

Move into the cloned repo and start the local interop environment:

```bash
./run_local.sh ./local-chains/v31.0/multi_chain
```

The first time running this will take a bit longer so dependencies can be compiled.

You should now have three local chains running:

- a local L1 chain running at port 8545
- a local L2 chain running at port 6565
- a second local L2 chain running at port 6566

> Note that once you end this process, the history of each chain will be completely erased.
> These are in-memory nodes, so they do no persist any storage of the chains.

#### Deploy a local test USD token

Move into the `token-contract` folder and install the dependencies:

```bash
cd examples/sso-interop-portal/token-contract
bun install
```

Then deploy the token contract with:

```bash
bun deploy-usd
```

You will see the deployed token contract address printed in the console.
You can also find it in the `token-contract/ignition/deployments/chain-6565/deployed_addresses.json` file.

> Note that you must redeploy the token each time you stop and start the local chains in the previous step,
> as the history is erased each time the local chains stop.
> Delete the `ignition/deployments` folder to erase the previous deployment record before redeploying.

#### Setup the frontend environment variables

Inside the `frontend` folder create a new `.env` file.
Use the `.env.example` file as a guide for your `.env`.

#### Restart the frontend

Restart the frontend app to see the interop tab enabled.

## Known Issues

The demo will be updated with new methods from the `zksync-sso` and `zksync-js`
SDKs once they have been fully updated to provide support for interop and SSO
account interactions. Until then, some of the code will be more verbose while
helper methods for interop and SSO are under development.

The L2 <-> L2 interop demo does uses a hardcoded private key in the frontend for a pre-configured rich wallet.
For a testnet or mainnet, this should be replaced to use the SSO wallet instead.

> NEVER use a private key with real funds on it in your frontend.

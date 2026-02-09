# SSO Interop Portal

This example shows how to implement:

- L1 <-> L2 interop to deposit and withdraw ETH into Aave on Sepolia testnet
- creating ZKsync SSO passkey-based accounts tied to a single domain
- sending basic ETH transfers using a passkey for authentication
- sending bundled transactions via the ZKsync SSO bundler
- (Optional) local L2 <-> L2 interop for sending ERC20 tokens and arbitrary
  messages between chains

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

### Prerequisites

You must have [`bun`](https://bun.com/docs/installation) installed to run the
basic app without L2 <-> L2 interop.

You must also be able to create a passkey on your device with user verification
enabled. This means some sort of biometric verification or your system PIN or
password. Make sure this is enabled on your device.

To run the full app including L2 <-> L2 interop, you must also install the
latest stable versions of [Rust](https://rust-lang.org/tools/install/) and
version `1.5.1` of `anvil` via
[`foundry`](https://getfoundry.sh/introduction/installation).

### Cloning the Repo

This repo contains submodules. To clone this repo, use:

```bash
git clone https://github.com/matter-labs/interop-examples --recursive
```

Or if you already have it cloned without the submodules, run:

```bash
git submodule update --init --recursive
```

### Basic setup (without L2 <-> L2 interop)

#### Fund your testnet wallet

You will need a wallet with some
[testnet ETH](https://docs.zksync.io/zksync-network/zksync-era/ecosystem/network-faucets#sepolia-faucets)
on sepolia and some testnet ETH on the ZKsync OS testnet. This wallet will be
used on the backend to deploy new SSO accounts, finalize L1 interop
transactions, and act as a faucet.

> Make sure to use a wallet that does not have any real funds on any mainnet
> network! This wallet should be for used development purposes only. If you're
> not sure what wallet to use, check out the
> [metamask browser extension](https://metamask.io/) or making a wallet with the
> [`cast` CLI](https://getfoundry.sh/cast/reference/wallet).

Follow the
[bridging instructions](https://docs.zksync.io/zksync-network/zksync-os/network-details#bridging-testnet-eth)
in the ZKsync docs to bridge some testnet ETH from sepolia to ZKsync OS testnet.
Make sure to leave some funds on sepolia as well.

#### Setup the backend environment variables

Inside the `backend` folder create a new `.env` file. Use the `.env.example`
file as a guide for your `.env`.

The only environment variables that MUST be set are:

- `EXECUTOR_PRIVATE_KEY`: this should be the private key of the wallet with
  testnet funds from the previous step.
- `L1_RPC_URL`: This should be an RPC URL for Sepolia testnet. You can get one
  for free from [Infura](https://www.infura.io/) or
  [Alchemy](https://www.alchemy.com/).

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

Open another terminal to run the frontend app. Install the dependencies with:

```bash
cd examples/sso-interop-portal/frontend
bun install
```

Then start the app with:

```bash
bun dev
```

#### Account setup

Once the app is running, you must create a new account by following the steps on
the home tab:

1. Create a new passkey.
2. Activate your new wallet (note: this is different than the wallet you used
   for the backend)

Once completed, you should have an embedded app-specific wallet initialized with
some testnet funds to try out the other tabs.

### Running with L2 <-> L2 interop

#### Setup local chains for interop testing

> Make sure you have [Rust](https://rust-lang.org/tools/install/) and version
> `1.5.1` of `anvil` via
> [`foundry`](https://getfoundry.sh/introduction/installation) installed.

Move into the ZKsync OS server folder:

```bash
cd zksync-os-server
```

Then run:

```bash
./run_local.sh ./local-chains/v31.0/multi_chain
```

The first time running this can take a few minutes for the dependencies to
compile.

You should now have three local chains running:

- a local L1 chain running at port 8545
- a local L2 chain running at port 3050 (chain ID 6565)
- a second local L2 chain running at port 3051 (chain ID 6566)

> Note that once you end this process, the history of each chain will be
> completely erased. These are in-memory nodes, so they do no persist any
> storage of the chains.

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

You will see the deployed token contract address printed in the console. You can
also find it in the
`token-contract/ignition/deployments/chain-6565/deployed_addresses.json` file.

> Note that you must redeploy the token contract each time you stop and start
> the local chains in the previous step, as the history is erased each time the
> local chains stop.

#### Setup the frontend environment variables

Inside the `frontend` folder create a new `.env` file. Use the `.env.example`
file as a guide for your `.env` to enable the interop tab.

#### Restart the frontend

Restart the frontend app to see the interop tab enabled.

## Known Issues

The demo will be updated with new methods from the `zksync-sso` and `zksync-js`
SDKs once they have been fully updated to provide support for interop and SSO
account interactions. Until then, some of the code will be more verbose while
helper methods for interop and SSO are under development.

The L2 <-> L2 interop demo does uses a hardcoded private key in the frontend for
a pre-configured rich wallet. For a testnet or mainnet, this should be replaced
to use the SSO wallet instead.

> NEVER use a private key with real funds on it in your frontend.

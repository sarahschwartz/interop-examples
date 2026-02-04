# SSO Interop Backend

There are five endpoints for the backend server:

1. `/health-check` (GET): returns a successful response if the server is
   healthy.
2. `/status` (POST): returns the finalization status of recent L2 to L1
   transactions for a given account.
3. `/new-l1-interop-tx` (POST): adds the given interop transaction to the
   pending transactions list.
4. `/deploy-account` (POST): deploys a new SSO account for a given passkey and
   calls the faucet. This endpoint should be modified for mainnet deployments so
   it does not try to call the faucet.
5. `/faucet`: (POST): checks the balance of the given account, its entrypoint,
   and its shadow account on the L1. If any of the balances are below the
   `MIN_BALANCE`, it sends some funds to them. This endpoint should be removed
   for mainnet deployments.

The server also runs a continuous process that tracks pending L2 <-> L1
transactions and finalizes them once they are fully executed.

The only environment variable that MUST be set is the `EXECUTOR_PRIVATE_KEY`.
This is the private key for the account use to finalize transactions, deploy new
SSO accounts, and transfer testnet funds. Make sure the account for the
`EXECUTOR_PRIVATE_KEY` has sufficient testnet funds on both the L1 and L2
networks.

# Interop Examples

This repo contains example scripts and applications to demonstrate
interoperability between ZKsync chains.

Further documentation is available in the official ZKsync docs.

## Contributing

Each new example should:

- either: - provide a unique use case for interop - or duplicate an existing use
  case but using a different tool or framework with significant differences.
- contain a `README.md` file with: - instructions for running the example
  locally - an overview of what the code does - instructions for how to use the
  app if applicable
- pass the linting rules configured in root of this repo. To check this, you can
  run `bun lint:check`.
- use the [`zksync-js`](https://matter-labs.github.io/zksync-js/latest/) and
  [`zksync-contracts`](https://github.com/matter-labs/zksync-contracts) SDKs
  when applicable.
- use [conventional commits](https://www.conventionalcommits.org/).

# SSO Interop Portal Frontend

## Setup

Install dependencies:

```bash
bun install
```

Run frontend:

```bash
bun dev
```

## Envrionment Configuration

To enable the Interop tab, use the `.env.example` file as guide for creating a
`.env` configuration.

## Adding support for new languages

To add support for a new language, make a new folder and respective `main.json`
file based on the examples in the `locales` folder. Then, update the supported
languages in configured in the `main.tsx` file in the `resources` object used to
initialize `i18n`. Finally, add the new language as an option in the
`Header.tsx` component.

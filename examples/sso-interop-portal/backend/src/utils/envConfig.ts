import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  HOST: z.string().min(1).default("localhost"),

  PORT: z.coerce.number().int().positive().default(4340),

  CORS_ORIGIN: z.string().url().default("http://localhost:5173"),

  COMMON_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),

  COMMON_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(1000),

  EXECUTOR_PRIVATE_KEY: z.string().length(66),

  L1_RPC_URL: z.string().url(),

  L2_RPC_URL: z.string().url().default("https://zksync-os-testnet-alpha.zksync.dev/"),

  L2_INTEROP_CENTER: z.string().length(42).default("0xc64315efbdcD90B71B0687E37ea741DE0E6cEFac"),

  L1_INTEROP_HANDLER: z.string().length(42).default("0xB0dD4151fdcCaAC990F473533C15BcF8CE10b1de"),

  POLL_INTERVAL: z.coerce.number().int().positive().default(30000),

  FINALIZATION_WAIT: z.coerce.number().int().positive().default(900000),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", parsedEnv.error.format());
  throw new Error("Invalid environment variables");
}

export const env = {
  ...parsedEnv.data,
  isDevelopment: parsedEnv.data.NODE_ENV === "development",
  isProduction: parsedEnv.data.NODE_ENV === "production",
  isTest: parsedEnv.data.NODE_ENV === "test",
};

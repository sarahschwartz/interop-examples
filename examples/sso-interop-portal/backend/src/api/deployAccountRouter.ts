import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Request, type Response, type Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";

import { deploySmartAccount } from "@/utils/accounts/deploy-account";
import { createApiResponse } from "@/utils/response/openAPIResponseBuilders";
import { ServiceResponse } from "@/utils/response/serviceResponse";

export const deployAccountRegistry = new OpenAPIRegistry();
export const deployAccountRouter: Router = express.Router();

deployAccountRegistry.registerPath({
  method: "post",
  path: "/deploy-account",
  tags: ["Deploy Account"],
  responses: {
    ...createApiResponse(z.null(), "Success", StatusCodes.OK),
    ...createApiResponse(z.null(), "Bad Request", StatusCodes.BAD_REQUEST),
  },
});

deployAccountRouter.post("/", async (req: Request, res: Response) => {
  const args = req.body;
  console.log("deploying account with args:", args);
  let serviceResponse;
  const BodySchema = z.object({
    originDomain: z.string().min(1),
    credentialId: z.string().min(10),
    credentialPublicKey: z.array(z.number()),
  });
  const parsed = BodySchema.safeParse(args);
  if (!parsed.success) {
    serviceResponse = ServiceResponse.failure("Missing required args", null);
  } else {
    const accountAddress = await deploySmartAccount(args.originDomain, args.credentialId, args.credentialPublicKey);
    serviceResponse = ServiceResponse.success("Account deployed", { accountAddress });
  }
  res.status(serviceResponse.statusCode).send(serviceResponse);
});

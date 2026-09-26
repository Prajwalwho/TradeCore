import fastifyJwt from "@fastify/jwt";
import fp from "fastify-plugin";
import { config } from "../config/env.js";

export const jwtPlugin = fp(async (app) => {
  app.register(fastifyJwt, {
    secret: config.jwtSecret,
  });
});
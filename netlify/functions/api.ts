import serverless from "serverless-http";
import { apiApp } from "../../backend/apiApp.ts";

export const handler = serverless(apiApp);

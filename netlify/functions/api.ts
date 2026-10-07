import serverless from "serverless-http";

const DEFAULT_SUMOPOD_DB_URL = "postgresql://uCoj6TRTrO7jX9Vai.jkt1_005:5476748abd33380c129ea855@pgsql-dbas-jkt1-005.sumobase.my.id:6432/dbb92bddb027b17d8a";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = DEFAULT_SUMOPOD_DB_URL;
}
if (!process.env.DB_SSL) {
  process.env.DB_SSL = "false";
}

import { apiApp } from "../../backend/apiApp.ts";

export const handler = serverless(apiApp);

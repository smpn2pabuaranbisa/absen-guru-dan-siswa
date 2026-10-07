import { apiApp } from "./backend/apiApp.ts";
import path from "path";
import express from "express";

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    apiApp.use(vite.middlewares);
  } else {
    apiApp.use(express.static(path.resolve(process.cwd(), "dist")));
    apiApp.get("*", (req, res) => {
      res.sendFile(path.resolve(process.cwd(), "dist", "index.html"));
    });
  }

  apiApp.listen(PORT, "0.0.0.0", () => {
    console.log(`[SIMS Master] Server running on port ${PORT}`);
  });
}

startServer();

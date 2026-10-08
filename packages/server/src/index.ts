import { createServer } from "node:http";
import type { Server } from "socket.io";
import { createApp } from "./app.js";
import { env } from "./env.js";

const app = createApp();
const httpServer = createServer(app);
(app.get("io") as Server).attach(httpServer);

httpServer.listen(env.port, () => {
  console.log(`sprintforge api listening on :${env.port}`);
});

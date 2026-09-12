import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // Node, not jsdom: what is worth testing here is server-side logic, above all the guard that
  // decides which addresses the site check may reach.
  test: { environment: "node" },
});

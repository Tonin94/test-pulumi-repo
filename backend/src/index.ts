// Punto di ingresso del Worker. Creato da cloud-pulumi una sola volta: puoi modificarlo.
import { hooks } from "./custom/hooks";
import { customRoutes } from "./custom/routes";
import { createApp } from "./generated/app";

const app = createApp({ hooks });
app.route("/", customRoutes);

export default app;

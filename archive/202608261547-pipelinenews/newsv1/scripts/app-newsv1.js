import { initialiseGaugesV9_2, loadGaugeChartsNewsV1 } from "./plugins/gauges-v9-2.js";
import { bindNewspaperNewsV1, loadNewsNewsV1 } from "./plugins/newspaper-newsv1.js";
import {
  bindProjectControlsNewsV1,
  loadProjectsNewsV1,
  refreshProjectsNewsV1,
} from "./plugins/projects-newsv1.js";
import { startPlugins } from "./core/plugin-host.js";

startPlugins([
  { id: "gauges", start: initialiseGaugesV9_2 },
  {
    id: "newspaper",
    dependsOn: ["gauges"],
    start() {
      bindNewspaperNewsV1(refreshProjectsNewsV1);
      loadNewsNewsV1();
    },
  },
  {
    id: "projects",
    dependsOn: ["gauges", "newspaper"],
    start() {
      bindProjectControlsNewsV1();
      loadProjectsNewsV1();
    },
  },
]);

loadGaugeChartsNewsV1();

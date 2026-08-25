import { initialiseGaugesV9_2, loadGaugeChartsNewsV7 } from "./plugins/gauges-v9-2.js";
import { loadCumulativeIntelligenceNewsV7 } from "./plugins/intelligence-newsv7.js";
import { bindNewspaperNewsV7, drawNewsNewsV7, loadNewsNewsV7 } from "./plugins/newspaper-newsv7.js";
import {
  bindProjectControlsNewsV7,
  loadProjectsNewsV7,
  refreshProjectsNewsV7,
} from "./plugins/projects-newsv7.js";
import { startPlugins } from "./core/plugin-host.js";

let intelligencePromise = null;

startPlugins([
  { id: "gauges", start: initialiseGaugesV9_2 },
  {
    id: "intelligence",
    dependsOn: ["gauges"],
    start() {
      intelligencePromise = loadCumulativeIntelligenceNewsV7();
    },
  },
  {
    id: "newspaper",
    dependsOn: ["gauges", "intelligence"],
    start() {
      bindNewspaperNewsV7(refreshProjectsNewsV7);
      const newsPromise = loadNewsNewsV7();
      Promise.allSettled([intelligencePromise, newsPromise]).then(() => {
        drawNewsNewsV7();
        refreshProjectsNewsV7();
      });
    },
  },
  {
    id: "projects",
    dependsOn: ["gauges", "intelligence", "newspaper"],
    start() {
      bindProjectControlsNewsV7();
      loadProjectsNewsV7();
    },
  },
]);

loadGaugeChartsNewsV7();

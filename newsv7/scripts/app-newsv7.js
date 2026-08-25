import { initialiseGaugesV9_2, loadGaugeChartsNewsV7 } from "./plugins/gauges-v9-2.js";
import { bindNewspaperNewsV7, drawNewsNewsV7, loadNewsNewsV7 } from "./plugins/newspaper-newsv7.js";
import {
  bindProjectControlsNewsV7,
  loadProjectsNewsV7,
  refreshProjectsNewsV7,
} from "./plugins/projects-newsv7.js";
import { startPlugins } from "./core/plugin-host.js";

function loadIntelligenceAfterNewspaper() {
  setTimeout(async () => {
    try {
      const { loadCumulativeIntelligenceNewsV7 } = await import("./plugins/intelligence-newsv7.js");
      await loadCumulativeIntelligenceNewsV7();
      drawNewsNewsV7();
      refreshProjectsNewsV7();
    } catch (error) {
      console.error("News V7 background intelligence unavailable", error);
    }
  }, 0);
}

startPlugins([
  { id: "gauges", start: initialiseGaugesV9_2 },
  {
    id: "newspaper",
    dependsOn: ["gauges"],
    start() {
      bindNewspaperNewsV7(refreshProjectsNewsV7);
      const newsPromise = loadNewsNewsV7();
      Promise.resolve(newsPromise).then(() => {
        drawNewsNewsV7();
        refreshProjectsNewsV7();
        loadIntelligenceAfterNewspaper();
      });
    },
  },
  {
    id: "projects",
    dependsOn: ["gauges", "newspaper"],
    start() {
      bindProjectControlsNewsV7();
      loadProjectsNewsV7();
    },
  },
]);

loadGaugeChartsNewsV7();

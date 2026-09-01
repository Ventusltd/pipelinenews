import { initialiseGaugesV9_2 } from "./202609010836-gauges.js";
import { bindNewspaperV9_6_2, loadNewsV9_6_2 } from "./202609010836-newspaper-v9-6-2.js";
import {
  bindProjectControlsV9_5_1,
  loadProjectsV9_5_1,
  refreshProjectsV9_5_1,
} from "./202609010836-projects-v9-5-1.js";
import { startPlugins } from "./202609010836-startplugins.js";

startPlugins([
  { id: "gauges", start: initialiseGaugesV9_2 },
  {
    id: "newspaper",
    dependsOn: ["gauges"],
    start() {
      bindNewspaperV9_6_2(refreshProjectsV9_5_1);
      loadNewsV9_6_2();
    },
  },
  {
    id: "projects",
    dependsOn: ["gauges", "newspaper"],
    start() {
      bindProjectControlsV9_5_1();
      loadProjectsV9_5_1();
    },
  },
]);

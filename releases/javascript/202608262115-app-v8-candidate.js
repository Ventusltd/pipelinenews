import { initialiseGaugesV9_2 } from "./202608261927-gauges.js";
import { bindNewspaperV9_6_2, loadNewsV9_6_2 } from "./202608261927-newspaper-v9-6-2.js";
import {
  bindProjectControlsV9_5_1,
  loadProjectsV9_5_1,
  refreshProjectsV9_5_1,
} from "./202608262115-projects-v8-windowed.js";
import { startPlugins } from "./202608261927-startplugins.js";

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

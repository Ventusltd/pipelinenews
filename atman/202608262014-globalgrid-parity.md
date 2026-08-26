# GlobalGrid V9.6.2 → modular PipelineNews parity

Audited against trusted GlobalGrid2050 commit
[`c36e41a689a62bdfa13b4258f3cbc48301854108`](https://github.com/Ventusltd/globalgrid2050/commit/c36e41a689a62bdfa13b4258f3cbc48301854108)
and PipelineNews commit `05797d51238e16f1e9cb041540a591d1c9b5b227`.

This audit supersedes the status conclusion in the immutable 18:30 Atman report,
which predates the 19:27 compiled release; that historical report remains untouched.

## Runtime source comparison

“Import-path only” means the executable body is identical; only the static import
specifier changes because PipelineNews stores all JavaScript source files in one
timestamped folder. The compiler then rewrites those imports to the dated release
names.

| Trusted GlobalGrid V9.6.2 | PipelineNews source | Comparison |
|---|---|---|
| `scripts/core/plugin-host.js` | `ui/javascript/202608261557-startplugins.js` | Byte-identical |
| `scripts/core/utils.js` | `ui/javascript/202608261630-utils.js` | Byte-identical |
| `scripts/core/state.js` | `ui/javascript/202608261632-state.js` | Byte-identical |
| `scripts/core/project-filter-v9-2.js` | `ui/javascript/202608261640-filters.js` | Byte-identical |
| `scripts/plugins/capacity-presentation-v9-3.js` | `ui/javascript/202608261723-capacity-presentation.js` | Byte-identical |
| `scripts/plugins/gauges-v9-2.js` | `ui/javascript/202608261725-gauges.js` | Byte-identical |
| `scripts/core/news-regions-v9-6-2.js` | `ui/javascript/202608261742-news-regions.js` | Import-path only |
| `scripts/data/canonical-projects-v9-1.js` | `ui/javascript/202608261752-canonical-projects-v9-1.js` | Byte-identical |
| `scripts/data/canonical-projects-v9-5-1.js` | `ui/javascript/202608261754-canonical-projects-v9-5-1.js` | Import-path only |
| `scripts/plugins/newspaper-v9-5-1.js` | `ui/javascript/202608261755-newspaper-v9-5-1.js` | Import-path only |
| `scripts/plugins/newspaper-v9-6-2.js` | `ui/javascript/202608261802-newspaper-v9-6-2.js` | Import-path only |
| `scripts/plugins/projects-v9-5-1.js` | `ui/javascript/202608261804-projects-v9-5-1.js` | Import-path only |
| `scripts/app-v9-6-2.js` | `ui/javascript/202608261806-app-v9-6-2.js` | Import-path only |
| Six files in `styles/` | Six timestamped files in `ui/styles/` | Byte-identical |
| `index.html` | `ui/templates/202608261927-shell-v9-6-2.html` | Byte-identical |

Result: all 13 trusted runtime modules are present. Seven are byte-identical and six
differ only at the import edges. All six stylesheets and the shell are byte-identical.

## Connection mapping

| Trusted working behaviour | Modular PipelineNews connection |
|---|---|
| Nested relative module imports | Compiler rewrites exactly 18 imports into `releases/javascript/` |
| V9.6.2 shell loads six styles and two modules | Compiler rewrites all local assets to dated `releases/` files |
| Chart.js is a runtime dependency | Pinned local Chart.js 4.5.1 replaces the CDN reference |
| Project build manifest drives 16 partitions | Compiled manifest points from the document to 16 shared root cartridges |
| Build manifest records 18 Atlas partitions | Compiler and publication gate validate 18 shared root cartridges |
| V9.6.2 renders 7,680 projects | Compiler and browser proof both require exactly 7,680 |
| Newspaper renders 133 headlines, 45 UK | Data and browser proof both require 133 / 45 |
| V9.6.2 browser smoke checks regional tabs and mobile table | PipelineNews proof carries the same desktop and 390/430/440/768 px assertions |

Bare `fetch()` URLs remain document-relative, exactly as the working application
expects. The release therefore references root `data/` once; data cartridges are not
copied into every release.

## Trusted Pages workflow comparison

| Trusted GlobalGrid Pages stage | PipelineNews implementation |
|---|---|
| Manual dispatch available | Manual dispatch only |
| Checkout deployment source | Checkout exact dispatch SHA with credentials disabled |
| Build/check committed app | Run immutable compiler `--check`, then independently verify every recorded byte and SHA-256 |
| Assemble `_site` | Reconstruct the last public PipelineNews closure, then overlay current `releases/` and shared `data/` |
| Browser proof | Gate upload on the adapted V9.6.2 desktop/mobile proof |
| Upload Pages artifact | Same `upload-pages-artifact@v3` stage |
| Deploy Pages | Same separate `deploy-pages@v4` job |
| Wait for live deployment | Poll until live release HTML matches the committed SHA-256 |
| Live V9.6.2 proof | Repeat the same browser proof against the deployed URL |

The active connection is `.github/workflows/pages.yml`. It intentionally preserves
`/newsv1`, `/newsv7`, all nine timestamped historical release paths, legacy release
pointers, objects, attestations and governed reports because a Pages deployment
replaces the whole published artifact.

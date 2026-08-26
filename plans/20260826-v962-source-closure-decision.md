# V9.6.2 source-closure decision

Status: **DRAFT SOURCE CLOSURE COMPLETE / NO TIMESTAMP RELEASE CREATED**  
Inspected GlobalGrid2050 head: `204aae6462a9851a8341af59760c3e7cb6ad08a5`  
PipelineNews planning head before this decision: `c7bd94e5569bbed23811972f019099493b29a69a`  
Accepted source path: `uk_renewables_pipeline/v9.6.2/`

## Decision

The recovery successor must copy the V9.6.2 interface and repository closure listed below. It must not reconstruct the layout from a later timestamp shell. The inventory proves 58 repository files: 40 browser-runtime files and 18 additional data files referenced by the frozen build manifest. The repository closure totals 12,831,093 bytes.

The source index is 8,502 bytes, Git blob `fe2b8e6eb9fb588e953d16c050df235c0d7c4b10`, SHA-256 `06382e57a58e460defcdd3c460ad01b93aa4c4578065348afa846b446e6d34ae`. The sixteen project partitions total 9,605,267 bytes and every calculated SHA-256 matches the frozen manifest. The eighteen Atlas partitions total 2,737,203 bytes and every calculated SHA-256 matches the frozen manifest.

## Dependency graph

- `index.html` directly loads six frozen stylesheets, two module entry points and one external chart library.
- `app-v9-6-2.js` loads gauges, newspaper, project-table and plugin-host modules.
- Those modules close over state, utilities, regional classification, project filtering, the V9.5.1 newspaper, and the V9.5.1/V9.1 canonical project loaders.
- The canonical loader fetches two release contracts, one build manifest and sixteen project partitions from the same origin.
- The newspaper first fetches the repository-root news payload and has a mutable cross-origin fallback to the repository's `main` raw URL.
- The build manifest additionally identifies eighteen Atlas partitions. They are pinned here even though the browser table does not fetch them during normal boot.

## Required copy substitutions

Only path-level closure substitutions are permitted in the successor and each must be recorded byte-for-byte:

1. Replace the unversioned external chart-library URL with a captured, content-pinned local copy; the current CDN URL is not immutable.
2. Replace both news-payload locations with one same-origin content-pinned copy. Do not retain a mutable `main` fallback.
3. Rewrite historical navigation targets as absolute GlobalGrid2050 URLs so the copied sidebar does not point at nonexistent PipelineNews siblings.
4. Change release labels and cache tokens only where required for the new immutable timestamp.
5. Apply the privacy gate to data before publication. Interface bytes remain the visual authority; individual-person names must not appear in successor-controlled output.

No engine, discovery, attribution, crawler or search improvement is authorised by this decision.

## Pinned repository inventory

| Class | Repository path | Bytes | Git blob | SHA-256 |
|---|---|---:|---|---|
| direct-runtime | `dist/major_project_news_v9_5_1.json` | 406514 | `7a7aa7b60eaca60ca0cdf2591b23df112d9f55da` | `cea104c3e9cfc07971680afdf5f64073e1d4825b63bfaf4e969266df8386ebbd` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/contracts/release.v9.1.json` | 1957 | `f3e707df6c699c0f375b207dc9bf706437b8d61a` | `bc21070f44aae1d32da333e4954816acd907aa8c9fa9cb639c64d651f7fd4259` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/contracts/release.v9.5.1.json` | 2505 | `86b1db362ca4bb58970839869a6a735c18b8d403` | `4137a31477be33a04b6ad5406d7cd13cefec1be8d84a94e23997c129c82076f1` |
| manifest-reference | `uk_renewables_pipeline/v9.6.2/data/v9.1/atlas/bess-part-001.geojson` | 185821 | `25413940ff9c5bdc56096217d4c7f24eeeaa4df5` | `70d936864c973c342729b37c6eb81151a9d2965e7fa2b6dff0cd998635c3581a` |
| manifest-reference | `uk_renewables_pipeline/v9.6.2/data/v9.1/atlas/bess-part-002.geojson` | 181213 | `2f4ea65f6652823f6ce17b72aa0c5094b0e84c01` | `791dbb6485e5161f1157c058dedf5221633042a5898206b842672e3b0b5f5d48` |
| manifest-reference | `uk_renewables_pipeline/v9.6.2/data/v9.1/atlas/bess-part-003.geojson` | 179165 | `324cc2e879fc706a16bae346651b549d9991dfa8` | `190d42c2ac743844fca134cf80ba3307e96d1dace175b1d855ccac26c8e5ad07` |
| manifest-reference | `uk_renewables_pipeline/v9.6.2/data/v9.1/atlas/bess-part-004.geojson` | 37826 | `71f2f418e586f4a0313735001ce7d723af26f887` | `27275a795cf4ea9e17d8b71ce3e695b421d96f04954d9c532e73d34388161951` |
| manifest-reference | `uk_renewables_pipeline/v9.6.2/data/v9.1/atlas/solar-part-001.geojson` | 185787 | `ae9a51c96316e6c4a9dd6ea4a79365cfe14f7f07` | `2c66e688e0966d0c8907f31d48811a86a34605c266c5bae11ec4468ae92ccf86` |
| manifest-reference | `uk_renewables_pipeline/v9.6.2/data/v9.1/atlas/solar-part-002.geojson` | 183444 | `14c141055b1eae04f148cbfdf4e5cc00a4c3fa6f` | `4b07ae35614e386c4160b9f0139ed6c6de5d749f0359e40b2fb006c4a62e6f45` |
| manifest-reference | `uk_renewables_pipeline/v9.6.2/data/v9.1/atlas/solar-part-003.geojson` | 178513 | `7a9f23a2c97657e862bd98416b4b0f9819fa9c45` | `b51bd20c614a779ce9926947444b19e3e048d6d9a6c579f36e93e3ea824e06a9` |
| manifest-reference | `uk_renewables_pipeline/v9.6.2/data/v9.1/atlas/solar-part-004.geojson` | 175390 | `b73c6e46c2ed1fe5e4f1a8bc8098c2fe87f6a6eb` | `7d3fff522ceca3a8f71568a44d9b9e51cc9acd958312bc154663de5d7ab9f512` |
| manifest-reference | `uk_renewables_pipeline/v9.6.2/data/v9.1/atlas/solar-part-005.geojson` | 173737 | `6e256ad1cba2dd2f8d1c14f41a621e64a26d3656` | `067e74aac181909807e9383d7a316f8ef602fb4a339a1f6365416fa9d2d6a107` |
| manifest-reference | `uk_renewables_pipeline/v9.6.2/data/v9.1/atlas/solar-part-006.geojson` | 178457 | `480bbfc18601331fdb1282443bf182b41dd66891` | `e252687e29d7d2450f2e0fac3c27ed14bc760897cdd6676697c69830898a19c8` |
| manifest-reference | `uk_renewables_pipeline/v9.6.2/data/v9.1/atlas/solar-part-007.geojson` | 183422 | `28a7a03c7b2a0cb0e4eee278bf471284a332ef19` | `f557f0e54aea75c5fd29527a9a15bcabfc261c87d6e82087604c18ca5c556c70` |
| manifest-reference | `uk_renewables_pipeline/v9.6.2/data/v9.1/atlas/solar-part-008.geojson` | 21425 | `0b22f8ee3bf7f78ad412cc6a730168ff26711ed0` | `bf9d31c63334b1525d1d5a9672fb093f38716278e33a21f7837f4188c5ee35de` |
| manifest-reference | `uk_renewables_pipeline/v9.6.2/data/v9.1/atlas/wind_offshore-part-001.geojson` | 33753 | `71808de243f85ebf06961661133d0a74fcb33ff5` | `b0bb0b5fd7b00ae4d94f14c8a20ad9519867e762d339968434c82f4263a0c452` |
| manifest-reference | `uk_renewables_pipeline/v9.6.2/data/v9.1/atlas/wind_onshore-part-001.geojson` | 176966 | `7626713afc31733d5cccf2e83e384f09e4cc3e69` | `bea59e1e17acef821616936763de2e9cda33ca8914d2451c7242352c16a6b8ba` |
| manifest-reference | `uk_renewables_pipeline/v9.6.2/data/v9.1/atlas/wind_onshore-part-002.geojson` | 175155 | `61cc8f0e2d61edcdb3d74bc52848bacc5777bfcc` | `88a10b117c157d312d8142515ff4935141b70451338495dbaf28c5d59ce96cb3` |
| manifest-reference | `uk_renewables_pipeline/v9.6.2/data/v9.1/atlas/wind_onshore-part-003.geojson` | 174204 | `ea43ea031ecb4b0647f37ab8b82a6da70febeb8f` | `430eb076f6dc8d4fcb3df819df47e3664c0b291dda604e2dd4d59978f051b09c` |
| manifest-reference | `uk_renewables_pipeline/v9.6.2/data/v9.1/atlas/wind_onshore-part-004.geojson` | 174540 | `2116a5ebab3fb09d40c96b394d53dd565120dbdc` | `9eff2764c9ee64837af4b417c620b25ba13c132cb3c6f5bebbdcd8c11ef24a4b` |
| manifest-reference | `uk_renewables_pipeline/v9.6.2/data/v9.1/atlas/wind_onshore-part-005.geojson` | 138385 | `0c196fdb824fc2585d098326d5a8ecdbba0fbf3c` | `fdb27b58dd70cde5257bf2296b227d1dc181dabb7261926f7ef3f6102ae2b887` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/data/v9.1/build_manifest.json` | 7849 | `ad3e10af27a3ca7e5475034c85f7008e6c3f52e2` | `67976a1bbcaf383ed7121b13060db3b864db9ce33dfc721a88b59c8ca8b8e06c` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/data/v9.1/projects/part-001.json` | 624542 | `cd862cde3daed0535d7d0be66c0fb153f05ded6c` | `6e72d36a8f880bfc39274221edf58d1b895202f01f2e56aae001ad25cb3b337d` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/data/v9.1/projects/part-002.json` | 629501 | `96dbb415c5a7ab03101d5c7aa77e06a9e7e25777` | `a2ba3598af8ff45726587b3a498c0f6a433ae007ec9eadbd5bfc682b7dca4b2e` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/data/v9.1/projects/part-003.json` | 628898 | `c6460927ace4aaae0975cc44d3e3887c93e8bc34` | `6f012e9251433e0d32095b2df75ae1c988a813a14647debe16c057dee550d23b` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/data/v9.1/projects/part-004.json` | 625997 | `8800b19dd0318e0af55aa34d3948ee7d815a7c46` | `1cdc7405098c85a477dd156930c4503ef7850ff005d1ec85a69928f10db6b7f5` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/data/v9.1/projects/part-005.json` | 631815 | `1de4674a4c76a73e3fb0c79dee7b52688c797afe` | `43988789140bf2211263ffe49b756bc8f7f4cd69531b2e91c56b2e7c2a90bcae` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/data/v9.1/projects/part-006.json` | 630303 | `1c8b2491e86b8428892031eaefd232e9284ffa06` | `e2c4d0c29e622270260e8fa71c1efae260e84fd3c9ebfa31b7dbf7bfe3da2d69` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/data/v9.1/projects/part-007.json` | 628660 | `9d3a203b0f8a79c43237a6fe435fa8ae62232d7f` | `8f2b2d2d74a031f459b94e626e288c11c148629e955f97ef688a27eb1a5e2c59` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/data/v9.1/projects/part-008.json` | 631189 | `48fefaca23be3a657edc971f29401ac59442b641` | `f3c0dff755bc657c41b3e04305403bbcfbf94be5d893e85309faf9dd7cb1fa92` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/data/v9.1/projects/part-009.json` | 630867 | `7b40c3a7ec9eeb7b155388cfc7f0bece8f2b4d69` | `a9427f109b7ad5ee881628fcbde3602daab62896e8517922ff68d2efe6a23b15` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/data/v9.1/projects/part-010.json` | 628464 | `5e1bac3be82e5228c84013b52db49500c172dea7` | `57145897a6a457f3bfb58f431d7bfa6a75dd63bfd2708eb56c3802391847c6b3` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/data/v9.1/projects/part-011.json` | 620261 | `e302e524ef11cb4198b4a218b28aad3199310328` | `e79c4eb42d1d366f01f8f2a941d92ff231b8ea14c2e40a2677a89601926938d1` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/data/v9.1/projects/part-012.json` | 615891 | `29de57efd6fb2670ba7899e991033da2a3538fd1` | `ad077a3172f6813f2a641e2f51ab693bf038cae03b5cbbdaa4167973ce7a7388` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/data/v9.1/projects/part-013.json` | 620861 | `f792e89825c56c0c48115ad2eaa6a0ca2ca79f5c` | `4545362b1355e256dc3025019f971ffa208cc8828059152a26b99ac66fb47817` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/data/v9.1/projects/part-014.json` | 619833 | `41e3aa5aeae3434d3e07170099cb4cf77799c519` | `9cf8da7fcbf3c1d08830c613c69d0447c490d6126be3ebe8c2d9021a4ddcd004` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/data/v9.1/projects/part-015.json` | 616440 | `b7cfd850124da6eae28b7e62b416a59ed3b636c7` | `109f20651ce1234d8933bb5efab78cbf45081ae7b4966e63ec0fca560a76cf03` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/data/v9.1/projects/part-016.json` | 221745 | `937ebccb33c0dacb9693fbc247472c490b6151c3` | `ed4c672a6cb684a5fd29e17e436d4ee632de358de5e0a2cee9801c7ffa5ecc4b` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/index.html` | 8502 | `fe2b8e6eb9fb588e953d16c050df235c0d7c4b10` | `06382e57a58e460defcdd3c460ad01b93aa4c4578065348afa846b446e6d34ae` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/scripts/app-v9-6-2.js` | 702 | `f37e16cf9f1f0160ecc4da8f4ce7bb509330cde2` | `4eed3a69f4755647dd223d45af438561bf80e6bd6b0a9bdacc5a789457b9e38d` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/scripts/core/news-regions-v9-6-2.js` | 4781 | `0127ebdd379d54b7f87b781f496a28e3c3e65325` | `dd8a50414632200f9022bb19b934df50dab3785f1f88cfeadb133a4a207ccaa5` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/scripts/core/plugin-host.js` | 669 | `159b7ae4029cc0686cd3770abf596919a928e5dd` | `e5aaa19b5bee93683fae461f7ead55d019e8c2edc8ce377680c0da634606e378` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/scripts/core/project-filter-v9-2.js` | 2532 | `dceee01d0f51e85b071aef275250c1fb223eeba7` | `007126279582d5dbbe6bb5ebf30a79fd998b4839e8498c5a9a76ab2e4033c842` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/scripts/core/state.js` | 574 | `ff9ef4ba413534b75c3ac51e064071bbbb4b2eea` | `7280acd43f72e166e7b7b3dac1d6e75439b1e1bf46b9e137c1b8aa891b52aad7` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/scripts/core/utils.js` | 707 | `c2ec95aa95a5d57911728963e187b7d0e840c6ce` | `bec300e2720e0793bc08434e91c0ea0dd8c3d8e36e79b97172e4d5270f01eda0` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/scripts/data/canonical-projects-v9-1.js` | 4014 | `69681ea72d0dd917eeb2e507c3c205d4454207f3` | `26dd3f1da795717b7e82b317a795658ef0c51338525f65a9c6b43ba2a88c0ebb` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/scripts/data/canonical-projects-v9-5-1.js` | 1791 | `b632ccdf34f2ae41a2ddf39c3ed415726bee265a` | `7e4bd9108eeaeb1b557e1b4f6ef4d8053f4429a4df46d5e5c8f886c4da88029b` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/scripts/plugins/capacity-presentation-v9-3.js` | 1916 | `9054ec9ba841807ad3887960f9e11e57a65065d8` | `650e2d1ca9fea55d0cb96db58c752e03ac03645499f033d11d4f76d29c917cef` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/scripts/plugins/gauges-v9-2.js` | 2753 | `1d081d2d9e1630912b912953cf18f431754f9e19` | `30803e3ecc787175bc31b6913541d52cc6065e9be2b50dc4d3ed900797348682` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/scripts/plugins/newspaper-v9-5-1.js` | 7887 | `43600e3a6e0edcd0ebffbe27d3e83e7c01231c93` | `3a328d6d8eaa55884a8bbf1f134db98caccea655c7379096833ffc4ad802a59f` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/scripts/plugins/newspaper-v9-6-2.js` | 3592 | `b676b5b1eba30ce0fa5e5c6a38b54b635eb50a08` | `d5ea34b3ff4b006e454edd012e02b993c93dd9db8951323fd0fbb865006e0eb9` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/scripts/plugins/projects-v9-5-1.js` | 18218 | `ac2cffee071baee3e297053f3f6334de10ab8004` | `7dd35aa7fbdc74b095fc9ff0ba26670b23fd34e8d04da7a7288a12aa2d4c5e32` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/styles/mobile.css` | 203 | `ace94d28df6890d206ce22a581ef7f13ed719948` | `9855b9c11255a85f477873d07cca45b057aedcdc8a6cc4aab2d29a0ffaac9b85` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/styles/v7.css` | 6245 | `ad3284c0025f5b8c7f90255fcbadf3d811f36e37` | `036dbfe43ef1ffb2c55ba277d49dec57ab7c7be976289226a5d568e1f1be319d` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/styles/v9-3.css` | 3581 | `d98d8acc7177c8d66fc75c1bef48fb6db4312c46` | `219782d5f3fba11b8418a5b46075a8b1b918eed272f6bc2360f6b1060c1f2e9b` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/styles/v9-4.css` | 402 | `3838c79ed304d6f7f98e20af5b21b00918f141fa` | `39f7d0fd3ff42e82407c1f5129444e6cc308ef5c0ec551d43c7396ac53310d17` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/styles/v9-5-1.css` | 408 | `f60533018ff2531be2af9a55e632a5017e48e43a` | `79ff5b1db85ae82a381fbad061c0122e7151bb9c9c7ba80c549051761f0bfae3` |
| direct-runtime | `uk_renewables_pipeline/v9.6.2/styles/v9-6-1.css` | 321 | `bb5c920402ba3639ef165de59cc2e4c345861322` | `851b0827ca2aa0950438c98ae3cf6cc7dce33667d37458122ea38bb2c6da2f81` |

## Gate for the next checkpoint

Checkpoint 3 may begin only from this inventory. It must create a new identifier from its actual inception minute, assemble the copied closure outside every frozen path, produce an audited substitution report, and pass deterministic privacy, integrity, desktop and 390-pixel browser checks before the first timestamp-release commit.

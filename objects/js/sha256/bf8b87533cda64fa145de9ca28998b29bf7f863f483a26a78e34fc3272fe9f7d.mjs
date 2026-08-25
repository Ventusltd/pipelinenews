import * as previous from "./0f0adf842d22158b882f168d6c131480afd81bce6609b8453a073f15d201d18c.mjs";

export const POLICY_ID = "PN-OFFICIAL-FRONTIER-V2-LOWERCASE-SLUG";
export const SOURCE_SCORES = previous.SOURCE_SCORES;
export const normalisePlanningReference = previous.normalisePlanningReference;
export const buildReferenceGroups = previous.buildReferenceGroups;
export const selectFrontier = previous.selectFrontier;
export const resolvePlanningBinding = previous.resolvePlanningBinding;
export const sourceHealth = previous.sourceHealth;

export function buildFrontierContract(input) {
  if (!/^\d{12}-pipelinenews$/.test(input.release_id)) throw new Error("release ID must use the lowercase pipelinenews slug");
  const legacyInput = { ...input, release_id: input.release_id.replace(/-pipelinenews$/, "-PipelineNews") };
  const contract = previous.buildFrontierContract(legacyInput);
  return {
    ...contract,
    release_id: input.release_id,
    policy_id: POLICY_ID,
    naming: {
      format: "YYYYMMDDHHmm-pipelinenews",
      path_slug: "pipelinenews",
      visible_title: "Pipeline News",
      lowercase_paths_required: true
    }
  };
}

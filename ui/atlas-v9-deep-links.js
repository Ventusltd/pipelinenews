(() => {
  'use strict';
  const RELEASE_ID = "202608292311-atlas-v9";
  const BASE_URL = "https://ventusltd.github.io/gridatlas/202608292311-atlas-v9/";
  const TECHNOLOGIES = new Set(['solar', 'bess', 'wind_onshore', 'wind_offshore']);
  const REPD_REF = /^[A-Za-z0-9-]{1,40}$/;

  function buildAtlasV9Url(project) {
    const repdRef = String(project?.repd_ref ?? project?.repdRef ?? '').trim();
    const technology = String(project?.technology ?? '').trim();
    if (!REPD_REF.test(repdRef) || !TECHNOLOGIES.has(technology)) return null;
    const query = new URLSearchParams({ repd_ref: repdRef, technology });
    for (const key of ['name', 'longitude', 'latitude']) {
      const value = project?.[key];
      if (value !== undefined && value !== null && String(value).trim()) query.set(key, String(value).trim());
    }
    return `${BASE_URL}?${query.toString()}`;
  }

  window.GridAtlasV9DeepLinks = Object.freeze({ releaseId: RELEASE_ID, baseUrl: BASE_URL, build: buildAtlasV9Url });
})();

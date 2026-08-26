export const state = {
  all: [],
  filtered: [],
  canonicalModel: null,
  tech: "All",
  status: "All",
  county: "All",
  search: "",
  charts: { solar: null, bess: null, projects: null, largest: null },
  newsItems: [],
  newsMode: "ALL",
  newsQuery: "",
};

export const COLORS = Object.freeze({
  Solar: "#ffff00",
  "Battery Storage": "#ffae00",
});

export const DATA_SOURCES = Object.freeze({
  newsPages: "../data/news/202608261927-major-project-news-v9-5-1.json",
  newsGitHub: "../data/news/202608261927-major-project-news-v9-5-1.json",
});

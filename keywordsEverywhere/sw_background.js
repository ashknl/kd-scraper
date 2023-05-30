try {
  importScripts(
    "/js/conf.js",
    "/js/SourceList.js",
    "/js/Cache.js",
    "/js/API.js",
    "/js/GoogleTrendsAPI.js",
    "/js/PinterestTrendsAPI.js",
    "/js/AutocompleteAPI.js",
    "/js/background.js"
  );
} catch (e) {
  console.log(e);
}

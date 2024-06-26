/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
 export const preloadHandlebarsTemplates = async function() {
  return loadTemplates([

    // Actor partials.
    "systems/windrose/templates/actor/parts/actor-gifts.html",
    "systems/windrose/templates/actor/parts/actor-summary.html",
  ]);
};

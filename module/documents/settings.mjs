export const registerSystemSettings = function () {

    game.settings.register("windrose", "supportAction", {
        name: "Blaze Support Action rules",
        hint: "teehee seeecret",
        scope: "world",
        config: true,
        requiresReload: true,
        default: false,
        type: Boolean
    })
}
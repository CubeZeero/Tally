import pkg from "../../package.json";

/** Current app version — single source of truth is package.json. */
export const APP_VERSION: string = pkg.version;

const development = /-dev(?:\.[0-9A-Za-z.-]+)?(?:\+.*)?$/.exec(APP_VERSION);
export const IS_DEVELOPMENT_BUILD = Boolean(development);
export const DISPLAY_VERSION = development ? APP_VERSION.slice(0, development.index) : APP_VERSION;

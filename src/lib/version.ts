import pkg from "../../package.json";

/** Current app version — single source of truth is package.json. */
export const APP_VERSION: string = pkg.version;

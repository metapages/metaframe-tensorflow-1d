// https://deno.land/manual/linking_to_external_code
export {
    npmPublish,
    npmVersion,
    ensureGitNoUncommitted,
} from "./npm.ts"; //"https://deno.land/x/gh:dionjwa:deno/ci/npm.ts";

export {
    sprintf,
    printf,
} from "https://deno.land/std/fmt/printf.ts";

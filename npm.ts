// deno ci scripts and tools
// lives locally, but the intention is to migrate to a shared repository once patterns emerge
// 
import * as path from "https://deno.land/std/path/mod.ts";
import { printf } from "https://deno.land/std/fmt/printf.ts";
import * as colors from "https://deno.land/std/fmt/colors.ts";

export const readJsonFile :<T>(filePath :string) => Promise<T> = async (filePath) => {
    let jsonBlob = await Deno.readTextFile(filePath);
    return JSON.parse(jsonBlob);
}

export interface CommandResult {
    exitCode:number;
    stdout ?:string;
    stderr ?:string;
}

export const command :(args :{cmd :string[], cwd ?:string, pipeToDeno ?:boolean}) => Promise<CommandResult> = async (args) => {
    let { cmd, cwd, pipeToDeno} = args;
    if (pipeToDeno === undefined) pipeToDeno = true;
    printf(colors.bold(cmd.join(' ') + '\n'));
    const process = Deno.run({
        cmd :cmd,
        cwd :cwd,
        stdout: 'piped',
        stderr: 'piped',
    });
    const status = await process.status();
    const result :CommandResult = { exitCode: status.code };
    if (status.code === 0) {
        const output = await process.output();
        result.stdout = new TextDecoder().decode(output);
        if (pipeToDeno) {
            console.log(result.stdout);
        }
    } else {
        const output = await process.stderrOutput();
        result.stderr = new TextDecoder().decode(output);
        if (pipeToDeno) {
            console.error(result.stderr);
        }
    }
    return result;
}

export interface NpmPublishArgs {
    artifactDirectory :string;
    npmToken:string;
}
/**
 * Point at a directory containing the assets ready to publish
 */
export const npmPublish :(args:NpmPublishArgs) => Promise<CommandResult> = async (args) => {
    const {artifactDirectory, npmToken} = args;
    const packageJson :{version:string} = await readJsonFile(path.join(artifactDirectory, 'package.json'));
    printf(colors.bold(`PUBLISHING npm version ${packageJson.version}\n`));
    await Deno.writeTextFile(path.join(artifactDirectory, '.npmrc'), `//registry.npmjs.org/:_authToken=${npmToken}`);
    return await command({cmd:['npm', 'publish', '.'], cwd:artifactDirectory});
}

export const npmVersion :(args :{cwd:string, npmVersionArg:string}) => Promise<CommandResult> = async (args) => {
    const {cwd, npmVersionArg} = args;
    const result = await command({cmd:['npm', 'version'].concat(npmVersionArg ? [npmVersionArg] : []), cwd});
    if (result.exitCode !== 0) {
        Deno.exit(result.exitCode);
    }
    return result;
}

export const ensureGitNoUncommitted :() => Promise<void> = async () => {
    const result = await command({cmd:'git status --untracked-files=no --porcelain'.split(' '), pipeToDeno:false});
    if (result.stdout && result.stdout.length > 0) {
        printf(colors.red(`Uncommitted git files\n`));
        printf(colors.red(`${result.stdout}\n`));
        Deno.exit(1);
    }
}
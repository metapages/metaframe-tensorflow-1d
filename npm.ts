// deno ci scripts and tools
// lives locally, but the intention is to migrate to a shared repository once patterns emerge
// 
import * as path from "https://deno.land/std/path/mod.ts";
const log = console.log;

export const readJsonFile :<T>(filePath :string) => Promise<T> = async (filePath) => {
    let jsonBlob = await Deno.readTextFile(filePath);
    return JSON.parse(jsonBlob);
}

export interface CommandResult {
    exitCode:number;
    stdout ?:string;
    stderr ?:string;
}

export const command :(cmd :string[], cwd ?:string, pipeToDeno ?:boolean) => Promise<CommandResult> = async (cmd, cwd, pipeToDeno = true) => {
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
        if (pipeToDeno) Deno.stdout.write(output);
    } else {
        const output = await process.stderrOutput();
        result.stderr = new TextDecoder().decode(output);
        if (pipeToDeno) Deno.stderr.write(output);
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
    log(`PUBLISHING npm version ${packageJson.version}`);
    await Deno.writeTextFile(path.join(artifactDirectory, '.npmrc'), `//registry.npmjs.org/:_authToken=${npmToken}`);
    return await command(['npm', 'publish', '.'], artifactDirectory);
}

export const npmVersion :(args :{cwd:string, npmVersionArg:string}) => Promise<CommandResult> = async (args) => {
    const {cwd, npmVersionArg} = args;
    return await command(['npm', 'version'].concat(npmVersionArg ? [npmVersionArg] : []), cwd);
}
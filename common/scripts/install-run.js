"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
// THIS FILE WAS GENERATED BY A TOOL. MODIFYING THIS FILE WILL PRODUCE UNEXPECTED BEHAVIOR.
//
// This script is intended for usage in an automated build environment where a Node tool may not have
// been preinstalled, or may have an unpredictable version.  This script will automatically install the specified
// version of the specified tool (if not already installed), and then pass a command-line to it.
// An example usage would be: "node common/scripts/install-run.js rimraf@2.6.2 rimraf -f project1/lib"
// For more information, see:
// [https://rushjs.io/pages/maintainer/setup_new_repo/](https://rushjs.io/pages/maintainer/setup_new_repo/)
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
exports.RUSH_JSON_FILENAME = 'rush.json';
const INSTALLED_FLAG_FILENAME = 'installed.flag';
const NODE_MODULES_FOLDER_NAME = 'node_modules';
const PACKAGE_JSON_FILENAME = 'package.json';
/**
 * Parse a package specifier (in the form of name\@version) into name and version parts.
 */
function parsePackageSpecifier(rawPackageSpecifier) {
    rawPackageSpecifier = (rawPackageSpecifier || '').trim();
    const separatorIndex = rawPackageSpecifier.lastIndexOf('@');
    let name;
    let version = undefined;
    if (separatorIndex === 0) {
        // The specifier starts with a scope and doesn't have a version specified
        name = rawPackageSpecifier;
    }
    else if (separatorIndex === -1) {
        // The specifier doesn't have a version
        name = rawPackageSpecifier;
    }
    else {
        name = rawPackageSpecifier.substring(0, separatorIndex);
        version = rawPackageSpecifier.substring(separatorIndex + 1);
    }
    if (!name) {
        throw new Error(`Invalid package specifier: ${rawPackageSpecifier}`);
    }
    return { name, version };
}
/**
 * Resolve a package specifier to a static version
 */
function resolvePackageVersion(rushCommonFolder, { name, version }) {
    if (!version) {
        version = '*'; // If no version is specified, use the latest version
    }
    if (version.match(/^[a-zA-Z0-9\-\+\.]+$/)) {
        // If the version contains only characters that we recognize to be used in static version specifiers,
        // pass the version through
        return version;
    }
    else {
        // version resolves to
        try {
            const rushTempFolder = ensureAndResolveFolder(rushCommonFolder, 'temp');
            copyNpmrcIfItExists(rushCommonFolder, rushTempFolder);
            const npmPath = getNpmPath();
            // This returns something that looks like:
            //  @microsoft/rush@3.0.0 '3.0.0'
            //  @microsoft/rush@3.0.1 '3.0.1'
            //  ...
            //  @microsoft/rush@3.0.20 '3.0.20'
            //  <blank line>
            const npmVersionSpawnResult = childProcess.spawnSync(npmPath, ['view', `${name}@${version}`, 'version', '--no-update-notifier'], {
                cwd: rushTempFolder,
                stdio: []
            });
            if (npmVersionSpawnResult.status !== 0) {
                throw new Error(`"npm view" returned error code ${npmVersionSpawnResult.status}`);
            }
            const npmViewVersionOutput = npmVersionSpawnResult.stdout.toString();
            const versionLines = npmViewVersionOutput.split('\n').filter((line) => !!line);
            const latestVersion = versionLines[versionLines.length - 1];
            if (!latestVersion) {
                throw new Error('No versions found for the specified version range.');
            }
            const versionMatches = latestVersion.match(/^.+\s\'(.+)\'$/);
            if (!versionMatches) {
                throw new Error(`Invalid npm output ${latestVersion}`);
            }
            return versionMatches[1];
        }
        catch (e) {
            throw new Error(`Unable to resolve version ${version} of package ${name}: ${e}`);
        }
    }
}
let _npmPath = undefined;
/**
 * Get the absolute path to the npm executable
 */
function getNpmPath() {
    if (!_npmPath) {
        try {
            if (os.platform() === 'win32') {
                // We're on Windows
                const whereOutput = childProcess.execSync('where npm', { stdio: [] }).toString();
                const lines = whereOutput.split(os.EOL).filter((line) => !!line);
                _npmPath = lines[lines.length - 1];
            }
            else {
                // We aren't on Windows - assume we're on *NIX or Darwin
                _npmPath = childProcess.execSync('which npm', { stdio: [] }).toString();
            }
        }
        catch (e) {
            throw new Error(`Unable to determine the path to the NPM tool: ${e}`);
        }
        _npmPath = _npmPath.trim();
        if (!fs.existsSync(_npmPath)) {
            throw new Error('The NPM executable does not exist');
        }
    }
    return _npmPath;
}
exports.getNpmPath = getNpmPath;
let _rushJsonFolder;
/**
 * Find the absolute path to the folder containing rush.json
 */
function findRushJsonFolder() {
    if (!_rushJsonFolder) {
        let basePath = __dirname;
        let tempPath = __dirname;
        do {
            const testRushJsonPath = path.join(basePath, exports.RUSH_JSON_FILENAME);
            if (fs.existsSync(testRushJsonPath)) {
                _rushJsonFolder = basePath;
                break;
            }
            else {
                basePath = tempPath;
            }
        } while (basePath !== (tempPath = path.dirname(basePath))); // Exit the loop when we hit the disk root
        if (!_rushJsonFolder) {
            throw new Error('Unable to find rush.json.');
        }
    }
    return _rushJsonFolder;
}
exports.findRushJsonFolder = findRushJsonFolder;
/**
 * Create missing directories under the specified base directory, and return the resolved directory.
 *
 * Does not support "." or ".." path segments.
 * Assumes the baseFolder exists.
 */
function ensureAndResolveFolder(baseFolder, ...pathSegments) {
    let resolvedDirectory = baseFolder;
    try {
        for (let pathSegment of pathSegments) {
            pathSegment = pathSegment.replace(/[\\\/]/g, '+');
            resolvedDirectory = path.resolve(resolvedDirectory, pathSegment);
            if (!fs.existsSync(resolvedDirectory)) {
                fs.mkdirSync(resolvedDirectory);
            }
        }
    }
    catch (e) {
        throw new Error(`Error building local installation directory (${path.resolve(baseFolder, ...pathSegments)}): ${e}`);
    }
    return resolvedDirectory;
}
function copyNpmrcIfItExists(rushCommonFolder, packageInstallFolder) {
    const npmrcPath = path.join(rushCommonFolder, 'config', 'rush', '.npmrc');
    const packageInstallNpmrcPath = path.join(packageInstallFolder, '.npmrc');
    if (fs.existsSync(npmrcPath)) {
        try {
            let npmrcFileLines = fs.readFileSync(npmrcPath).toString().split('\n');
            npmrcFileLines = npmrcFileLines.map((line) => (line || '').trim());
            const resultLines = [];
            // Trim out lines that reference environment variables that aren't defined
            for (const line of npmrcFileLines) {
                const regex = /\$\{([^\}]+)\}/g; // This finds environment variable tokens that look like "${VAR_NAME}"
                const environmentVariables = line.match(regex);
                let lineShouldBeTrimmed = false;
                if (environmentVariables) {
                    for (const token of environmentVariables) {
                        // Remove the leading "${" and the trailing "}" from the token
                        const environmentVariableName = token.substring(2, token.length - 1);
                        if (!process.env[environmentVariableName]) {
                            lineShouldBeTrimmed = true;
                            break;
                        }
                    }
                }
                if (!lineShouldBeTrimmed) {
                    resultLines.push(line);
                }
            }
            fs.writeFileSync(packageInstallNpmrcPath, resultLines.join(os.EOL));
        }
        catch (e) {
            throw new Error(`Error reading or writing .npmrc file: ${e}`);
        }
    }
}
/**
 * Detects if the package in the specified directory is installed
 */
function isPackageAlreadyInstalled(packageInstallFolder) {
    try {
        const flagFilePath = path.join(packageInstallFolder, INSTALLED_FLAG_FILENAME);
        if (!fs.existsSync(flagFilePath)) {
            return false;
        }
        const fileContents = fs.readFileSync(flagFilePath).toString();
        return fileContents.trim() === process.version;
    }
    catch (e) {
        return false;
    }
}
/**
 * Removes the following files and directories under the specified folder path:
 *  - installed.flag
 *  -
 *  - node_modules
 */
function cleanInstallFolder(rushCommonFolder, packageInstallFolder) {
    try {
        const flagFile = path.resolve(packageInstallFolder, INSTALLED_FLAG_FILENAME);
        if (fs.existsSync(flagFile)) {
            fs.unlinkSync(flagFile);
        }
        const packageLockFile = path.resolve(packageInstallFolder, 'package-lock.json');
        if (fs.existsSync(packageLockFile)) {
            fs.unlinkSync(packageLockFile);
        }
        const nodeModulesFolder = path.resolve(packageInstallFolder, NODE_MODULES_FOLDER_NAME);
        if (fs.existsSync(nodeModulesFolder)) {
            const rushRecyclerFolder = ensureAndResolveFolder(rushCommonFolder, 'temp', 'rush-recycler', `install-run-${Date.now().toString()}`);
            fs.renameSync(nodeModulesFolder, rushRecyclerFolder);
        }
    }
    catch (e) {
        throw new Error(`Error cleaning the package install folder (${packageInstallFolder}): ${e}`);
    }
}
function createPackageJson(packageInstallFolder, name, version) {
    try {
        const packageJsonContents = {
            'name': 'ci-rush',
            'version': '0.0.0',
            'dependencies': {
                [name]: version
            },
            'description': 'DON\'T WARN',
            'repository': 'DON\'T WARN',
            'license': 'MIT'
        };
        const packageJsonPath = path.join(packageInstallFolder, PACKAGE_JSON_FILENAME);
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJsonContents, undefined, 2));
    }
    catch (e) {
        throw new Error(`Unable to create package.json: ${e}`);
    }
}
/**
 * Run "npm install" in the package install folder.
 */
function installPackage(packageInstallFolder, name, version) {
    try {
        console.log(`Installing ${name}...`);
        const npmPath = getNpmPath();
        const result = childProcess.spawnSync(npmPath, ['install'], {
            stdio: 'inherit',
            cwd: packageInstallFolder,
            env: process.env
        });
        if (result.status !== 0) {
            throw new Error('"npm install" encountered an error');
        }
        console.log(`Successfully installed ${name}@${version}`);
    }
    catch (e) {
        throw new Error(`Unable to install package: ${e}`);
    }
}
/**
 * Get the ".bin" path for the package.
 */
function getBinPath(packageInstallFolder, binName) {
    const binFolderPath = path.resolve(packageInstallFolder, NODE_MODULES_FOLDER_NAME, '.bin');
    const resolvedBinName = (os.platform() === 'win32') ? `${binName}.cmd` : binName;
    return path.resolve(binFolderPath, resolvedBinName);
}
/**
 * Write a flag file to the package's install directory, signifying that the install was successful.
 */
function writeFlagFile(packageInstallFolder) {
    try {
        const flagFilePath = path.join(packageInstallFolder, INSTALLED_FLAG_FILENAME);
        fs.writeFileSync(flagFilePath, process.version);
    }
    catch (e) {
        throw new Error(`Unable to create installed.flag file in ${packageInstallFolder}`);
    }
}
function installAndRun(packageName, packageVersion, packageBinName, packageBinArgs) {
    const rushJsonFolder = findRushJsonFolder();
    const rushCommonFolder = path.join(rushJsonFolder, 'common');
    const packageInstallFolder = ensureAndResolveFolder(rushCommonFolder, 'temp', 'install-run', `${packageName}@${packageVersion}`);
    if (!isPackageAlreadyInstalled(packageInstallFolder)) {
        // The package isn't already installed
        cleanInstallFolder(rushCommonFolder, packageInstallFolder);
        copyNpmrcIfItExists(rushCommonFolder, packageInstallFolder);
        createPackageJson(packageInstallFolder, packageName, packageVersion);
        installPackage(packageInstallFolder, packageName, packageVersion);
        writeFlagFile(packageInstallFolder);
    }
    const statusMessage = `Invoking "${packageBinName} ${packageBinArgs.join(' ')}"`;
    const statusMessageLine = new Array(statusMessage.length + 1).join('-');
    console.log(os.EOL + statusMessage + os.EOL + statusMessageLine + os.EOL);
    const binPath = getBinPath(packageInstallFolder, packageBinName);
    const result = childProcess.spawnSync(binPath, packageBinArgs, {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: process.env
    });
    return result.status;
}
exports.installAndRun = installAndRun;
function runWithErrorAndStatusCode(fn) {
    process.exitCode = 1;
    try {
        const exitCode = fn();
        process.exitCode = exitCode;
    }
    catch (e) {
        console.error(os.EOL + os.EOL + e.toString() + os.EOL + os.EOL);
    }
}
exports.runWithErrorAndStatusCode = runWithErrorAndStatusCode;
function run() {
    const [nodePath, /* Ex: /bin/node */ // tslint:disable-line:no-unused-variable
    scriptPath, /* /repo/common/scripts/install-run-rush.js */ rawPackageSpecifier, /* rimraf@^2.0.0 */ packageBinName, /* rimraf */ ...packageBinArgs /* [-f, myproject/lib] */] = process.argv;
    if (path.basename(scriptPath).toLowerCase() !== 'install-run.js') {
        // If install-run.js wasn't directly invoked, don't execute the rest of this function. Return control
        // to the script that (presumably) imported this file
        return;
    }
    if (process.argv.length < 4) {
        console.log('Usage: install-run.js <package>@<version> <command> [args...]');
        console.log('Example: install-run.js rimraf@2.6.2 rimraf -f project1/lib');
        process.exit(1);
    }
    runWithErrorAndStatusCode(() => {
        const rushJsonFolder = findRushJsonFolder();
        const rushCommonFolder = ensureAndResolveFolder(rushJsonFolder, 'common');
        const packageSpecifier = parsePackageSpecifier(rawPackageSpecifier);
        const name = packageSpecifier.name;
        const version = resolvePackageVersion(rushCommonFolder, packageSpecifier);
        if (packageSpecifier.version !== version) {
            console.log(`Resolved to ${name}@${version}`);
        }
        return installAndRun(name, version, packageBinName, packageBinArgs);
    });
}
run();

//# sourceMappingURL=install-run.js.map

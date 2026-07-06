/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 436:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const utils = __nccwpck_require__(862)

class github {

    /**
     * Issue git command
     *
     * @param  workingDir      the working directory
     * @param  command         git command to issue
     */
    static _cmd(workingDir, command, quiet) {
        if (!workingDir) {
            console.warn('Git operation skipped, must specify working directory')
        } 
        else {
            var cmd=`git ${command}`
            const res = utils.sh(cmd, {cwd: workingDir})
            if (!quiet) {
                console.log('>>>', cmd, '\n', res, '\n<<<')
            } 
            return res
        }
    }

    /**
     * Validate if a tag exists in remote.
     *
     * @Example
     * <pre>
     *     if (github.tagExistsRemote('v1.2.3')) {
     *         echo "Tag v1.2.3 already exists in remote."
     *     }
     * </pre>
     *
     * @param tag     tag name to check
     * @return        true/false
     */
    static tagExistsRemote(tag) {
        var remotedTags = utils.sh('git ls-remote --tags').split("\n")
        var foundTag = false

        remotedTags.forEach(eachtag => {
            if (eachtag.endsWith(`refs/tags/${tag}`)) { 
                foundTag = true 
            }
        })
        return foundTag
    }

    /**
     * Tag the branch and push to remote.
     *
     * @Note Currently only support lightweighted tag.
     *
     * @param  tag           tag name to be created
     */
    static tag(tag) {
        // init with arguments
        if (!tag) {
            throw new Error('tag name is missing, failed to tag')
        }

        console.log(utils.sh(`git tag "${tag}" && git push origin "${tag}"`))
    }

    /**
     * Clone a remote repository
     *
     * @param  repo            the repository name, required 
     * @param  dir             the directory name to place the clone, required
     * @param  branch          the branch name to be cloned, optional
     * @param  shallow         flag to do shallow clone (just clone latest one history), optional
     */
    static clone(repo, dir, branch, shallow) {
        if (!repo || !dir) {
            console.warn('Clone operation skipped, must specify both mandatory arguments: repo, dir')
        } 
        else {
            var cmd = `mkdir -p ${dir} && git clone`
            if (branch) {
                if (shallow) {
                    cmd += ' --depth 1'
                }
                cmd += ` --single-branch --branch ${branch}`
            }
            var fullRepo = ` https://github.com/${repo}.git ${dir}`
            cmd += fullRepo
            utils.sh(cmd)
        }
    }

    /**
     * Hard reset a repository, removing all (/staged) changes
     *
     * @param  branch          the branch name to be reset, required
     * @param  workingDir      the working directory
     */
    static hardReset(branch, workingDir, quiet) {
        if (!branch) {
            console.warn('Hard reset operation skipped, must specify branch')
        } 
        else {
            return this._cmd(workingDir, `reset --hard ${branch}`, quiet)
        }
    }

    /**
     * Fetch latest changes from remote
     *
     * @param  workingDir      the working directory
     */
    static fetch(workingDir, quiet) {
        return this._cmd(workingDir, `fetch`, quiet)
    }

    /**
     * Pull down latest changes from remote
     *
     * @param  workingDir      the working directory
     */
    static pull(workingDir, quiet) {
        return this._cmd(workingDir, `pull`, quiet)
    }

    /**
     * Add file to commit
     *
     * @param  workingDir      the working directory
     * @param  file            file to add
     */
    static add(workingDir, file, quiet) {
        return this._cmd(workingDir, `add ${file}`, quiet)
    }

    /**
     * Create new commit
     *
     * @param  workingDir      the working directory
     * @param  message         commit message
     */
    static commit(workingDir, message, quiet) {
        return this._cmd(workingDir, `commit -s -m "${message}"`, quiet)
    }

    /**
     * Push committed changes to a remote repository
     *
     * @param  branch          the branch to be pushed to, required
     * @param  dir             the working directory, required
     */
    static push(branch, dir, username, passwd, repo, quiet) {
        if (!branch) {
            console.warn('Push operation skipped, must specify argument: branch')
        } 
        else {
            return this._cmd(dir, `push https://${username}:${passwd}@github.com/${repo} ${branch}`, quiet)
        }
    }

    /**
     * Check if current branch is synced with remote
     * 
     * @param  branch          the branch to be checked against, required
     * @param  dir             the working directory, required
     */
    static isSync(branch, dir) {
        // update remote
        utils.sh(`cd ${dir} && git fetch origin`)
        // get last hash
        var localHash = utils.sh(`cd ${dir} && git rev-parse ${branch}`)
        var remoteHash = utils.sh(`cd ${dir} && git rev-parse origin/${branch}`)

        if (localHash == remoteHash) {
            console.log('Working directory is synced with remote.')
            return true
        } else {
            console.warn(`Working directory is not synced with remote:
                local : ${localHash}
                remote: ${remoteHash}`)
            return false
        }
    }

    /**
     * Shallow clone a remote repository with latest
     *
     * @param  dir             the directory of where the this new branch checkouts to, required
     * @param  branch          the branch name to be newly made, required
    */
    static createOrphanBranch(dir, branch){
        if (!dir || !branch) {
            console.warn('createOrphanBranch operation skipped, must specify all three arguments: repo, dir and branch')
        }
        else {
            var cmd = `mkdir -p ${dir} && cd ${dir}`
            cmd += ` && git switch --orphan ${branch}`
            cmd += ' && git commit --allow-empty -m "Initial commit on orphan branch"'
            utils.sh(cmd)
        }
    }
}

module.exports = github;

/***/ }),

/***/ 862:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const { execSync, spawnSync } = __nccwpck_require__(81)
const fs = __nccwpck_require__(147)
const semver = __nccwpck_require__(111) 

class utils {

	static sh(cmd, options = {}) {
        return execSync(cmd, options).toString().trim()
	}
	
	static sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    static dateTimeNow() {
        return (new Date()).toISOString().split('.')[0].replace(/[^0-9]/g, "")
    }
	
	static parseSemanticVersion(version) {
        var versionJson = {}
        versionJson['major'] = semver.major(version)
        versionJson['minor'] = semver.minor(version)
        versionJson['patch'] = semver.patch(version)
        const prerelease = semver.prerelease(version);
        versionJson['prerelease'] = prerelease ? (Array.isArray(prerelease) ? prerelease.join('.') : String(prerelease)) : ''
        return versionJson
    }
	
	static combineSemanticVersion(versionJson) {
        let version = `${versionJson['major']}.${versionJson['minor']}.${versionJson['patch']}`;
        if (versionJson['prerelease']) {
            version += `-${versionJson['prerelease']}`;
        }

        return version;
    }

	static fileExists(path, quiet) {
        try {
            fs.accessSync(path, fs.constants.F_OK)
            if (!quiet) {console.log(`${path} exists :D `)}
            return true
        } catch {
            if (!quiet) {console.warn(`${path} does not exist :(`)}
            return false
        }
    }
	
	static findAllFiles(directory, pname){
		const packageNames = utils.sh(`cd ${directory} && echo $(find . -name ${pname} | { grep -v node_modules || true; })`);
		return packageNames
	}
	
	
	static bumpPackageJson(packageFile, version){
		if (version == '') {
            version = 'MINOR';
        }
		
		const oldVersion = this.sh(`grep '"version"' ${packageFile} | cut -d '"' -f 4 | head -n 1`);
		if (!oldVersion) {
            console.log(`Version is not defined in ${packageFile}`);
            return;
        }
        let oldVersionParsed = this.parseSemanticVersion(oldVersion);

        switch (version.toUpperCase()) {
            case 'PATCH':
                oldVersionParsed['patch'] = parseInt(oldVersionParsed['patch'], 10) + 1;
                break;
            case 'MINOR':
                oldVersionParsed['minor'] = parseInt(oldVersionParsed['minor'], 10) + 1;
                break;
            case 'MAJOR':
                oldVersionParsed['major'] = parseInt(oldVersionParsed['major'], 10) + 1;
                break;
            default:
                oldVersionParsed = this.parseSemanticVersion(version);
                break;
        }
        const newVersion = this.combineSemanticVersion(oldVersionParsed);
		const data = fs.readFileSync(`${packageFile}`, {encoding:'utf8', flag:'r'});
		const newData = data.replace(`"version": "${oldVersion}"`, `"version": "${newVersion}"`)
		fs.writeFileSync(`${packageFile}`, newData);
		
	}
	
	static getNewVersion(packageFile){
		const version = this.sh(`grep '"version"' ${packageFile} | cut -d '"' -f 4 | head -n 1`);
		return `${version}`;
	}
}


module.exports = utils;


/***/ }),

/***/ 471:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 198:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 380:
/***/ ((module) => {

module.exports = eval("require")("debug");


/***/ }),

/***/ 111:
/***/ ((module) => {

module.exports = eval("require")("semver");


/***/ }),

/***/ 81:
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ 147:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const core = __nccwpck_require__(471)
const utils = __nccwpck_require__(862)
const github = __nccwpck_require__(436)
const Debug = __nccwpck_require__(380)
const actionsGithub = __nccwpck_require__(198)



var version = core.getInput('version')
var branch = core.getInput('branch')
var repo = actionsGithub.context.repo.owner + '/' + actionsGithub.context.repo.repo

if (branch == ''){
	branch = 'v3.x/staging'
}
if (version == '') {
    version = 'MINOR'
}


// get temp folder for cloning
var tempFolder = `${process.env.RUNNER_TEMP}/.tmp-npm-registry-${utils.dateTimeNow()}`
console.log(`${tempFolder}`)

console.log(`Cloning ${branch} into ${tempFolder} ...`)
// clone to temp folder
github.clone(repo,tempFolder,branch)

// echo version
console.log(`Making a "${version}" version bump ...`)

 
var newVersion
var res
var workdir = tempFolder;


// bump package.json 
utils.bumpPackageJson(`${workdir}/package.json`,version)
console.log(utils.sh(`cat ${workdir}/package.json `));
newVersion = utils.getNewVersion(`${workdir}/package.json`)


github._cmd(tempFolder, 'status');
github._cmd(tempFolder, 'diff');
github.add(workdir, 'package.json')
res = github.commit(tempFolder, newVersion)


if (res.includes('Git working directory not clean.')) {
	throw new Error('Working directory is not clean')
} else if (!newVersion.match(/^v[0-9]+\.[0-9]+\.[0-9]+$/)) {
	throw new Error(`Bump version failed: ${newVersion}`)
}


console.log(`Pushing ${branch} to remote ...`)
github.push(branch, tempFolder, actionsGithub.context.actor, process.env.GITHUB_TOKEN, repo)
if (!github.isSync(branch, tempFolder)) {
	throw new Error('Branch is not synced with remote after npm version.')
}
})();

module.exports = __webpack_exports__;
/******/ })()
;
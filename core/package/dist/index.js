/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 18:
/***/ ((module) => {

/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

/**
 * An exception that can be thrown if an argument is invalid or missing.
 */

class InvalidArgumentException extends Error {
    /**
     * Construct the exception.
     *
     * @param argument   The argument name which value is invalid.
     * @param message    The exception message.
     */
    constructor(argument, message) {
        super(message ? message : `Argument ${argument} is not provided or invalid`)
        this.argument = argument
    }
}
module.exports = InvalidArgumentException; 

/***/ }),

/***/ 666:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const fs = __nccwpck_require__(147)
const Debug = __nccwpck_require__(380)
const InvalidArgumentException = __nccwpck_require__(18)
const utils = __nccwpck_require__(862)
const PATH_CONTENT = 'content'
const PATH_ASCII = 'ascii'

class pax{


    static pack(args) {
        const func = 'pack:'
        const job = args.get('job')
        const paxSSHHost = args.get('paxSSHHost')
        const paxSSHPort = args.get('paxSSHPort')
        const paxSSHUsername = args.get('paxSSHUsername')
        const paxSSHPassword = args.get('paxSSHPassword') 
        const filename = args.get('filename')
        const paxOptions = args.get('paxOptions')
        const extraFilesArg = args.get('extraFiles')
        var environmentText = args.get('environments')
        const compress = args.get('compress')
        const compressOptions = args.get('compressOptions')
        var keepTempFolderArg = false
		const currentBranch = args.get('currentBranch')
		const jclBuildNumber = args.get('jclBuildNumber')
		const paxName = args.get('paxName')
		const mvdHomeDir = args.get('mvdHomeDir')
		const maristNode = args.get('maristNode')
		

        var paxLocalWorkspace = args.get('paxLocalWorkspace')
        var paxRemoteWorkspace = args.get('paxRemoteWorkspace')
		var paxPackageDir = args.get('paxPackageDir')

        // validate arguments
        if (!paxSSHHost) {
            throw new InvalidArgumentException('paxSSHHost')
        }
        if (!paxSSHPort) {
            throw new InvalidArgumentException('paxSSHPort')
        }
        if (!paxSSHUsername) {
            throw new InvalidArgumentException('paxSSHUsername')
        }
        if (!paxSSHPassword) {
            throw new InvalidArgumentException('paxSSHPassword')
        }
        if (!job) {
            throw new InvalidArgumentException('job')
        }
        if (!paxLocalWorkspace){
            throw new InvalidArgumentException('paxLocalWorkspace')
        }
        if (!paxRemoteWorkspace){
            throw new InvalidArgumentException('paxRemoteWorkspace')
        }
		if (!currentBranch){
            throw new InvalidArgumentException('currentBranch')
        }
		if (!jclBuildNumber){
            throw new InvalidArgumentException('jclBuildNumber')
        }
		if (!paxName){
            throw new InvalidArgumentException('paxName')
        }
		if (!mvdHomeDir){
            throw new InvalidArgumentException('mvdHomeDir')
        }
		if (!maristNode){
			throw new InvalidArgumentException('maristNode')
		}
		
		try {
            // Step 1: make packaging folder
			console.log('We are using new container')
			var cmd = `rm -rf ${paxRemoteWorkspace}/${paxName}-${currentBranch}-${jclBuildNumber} && mkdir -p ${paxRemoteWorkspace}/${paxName}-${currentBranch}-${jclBuildNumber}`
            utils.ssh(paxSSHHost,paxSSHPort,paxSSHUsername,paxSSHPassword,cmd)
            console.log(`[Step 1]: make folder created `)

            // Step 2: sand tar files over
			var cmd2 = `put ${mvdHomeDir}/zowe-install-packaging/bin/utils/tag-files.sh ${paxRemoteWorkspace}/${paxName}-${currentBranch}-${jclBuildNumber}/tag-files.sh
put ${mvdHomeDir}/zlux.tar ${paxRemoteWorkspace}/${paxName}-${currentBranch}-${jclBuildNumber}/zlux.tar			`
			utils.sftp(paxSSHHost,paxSSHPort,paxSSHUsername,paxSSHPassword,cmd2)
            console.log(`[Step 2]: sftp put zlux.tar and tag-files.sh completed`)

			// step 3: package
            var cmd3 = `cd ${paxRemoteWorkspace}/${paxName}-${currentBranch}-${jclBuildNumber}
export _BPXK_AUTOCVT=ON
chtag -tc iso8859-1 tag-files.sh 
chmod +x tag-files.sh 
mkdir -p zlux/share && cd zlux 
mkdir bin && cd share 
tar xpoUf ../../zlux.tar 
../../tag-files.sh . 
cd zlux-server-framework 
rm -rf node_modules 
export NODE_HOME=${maristNode}
_TAG_REDIR_ERR=txt _TAG_REDIR_IN=txt _TAG_REDIR_OUT=txt __UNTAGGED_READ_MODE=V6 PATH=${maristNode}/bin:.:/bin npm --verbose install --cache /ZOWE/tmp/.npm
cd .. 
iconv -f iso8859-1 -t 1047 zlux-app-server/defaults/serverConfig/server.json > zlux-app-server/defaults/serverConfig/server.json.1047 
mv zlux-app-server/defaults/serverConfig/server.json.1047 zlux-app-server/defaults/serverConfig/server.json 
chtag -tc 1047 zlux-app-server/defaults/serverConfig/server.json 
cd zlux-app-server/bin 
cp start.sh configure.sh ../../../bin 
if [ -e "validate.sh" ]; then
  cp validate.sh ../../../bin
fi
cd ..
if [ -e "manifest.yaml" ]; then
  cp manifest.yaml ../../
fi
if [ -d "schemas" ]; then
  cp -r schemas ../../
fi
cd ../../
chmod -R 755 *
pax -o saveext -pp -wf ../zlux.pax *`
            utils.ssh(paxSSHHost,paxSSHPort,paxSSHUsername,paxSSHPassword,cmd3)
            console.log('[Step 3]: packaging completed')
			
			// step 4: copy back pax file
			var cmd4 = `get ${paxRemoteWorkspace}/${paxName}-${currentBranch}-${jclBuildNumber}/zlux.pax ${mvdHomeDir}/zlux.pax`
			utils.sftp(paxSSHHost,paxSSHPort,paxSSHUsername,paxSSHPassword,cmd4)
            console.log('[Step 4]: copy back files completed')
			
        } catch (ex1) {
            // throw error
            throw new Error(`Pack Pax package failed: ${ex1}`)
        } finally {
			console.log('cleaning up all temporary')
			var cmdClean = `rm -rf ${paxRemoteWorkspace}/${paxName}-${currentBranch}-${jclBuildNumber}`
			utils.ssh(paxSSHHost,paxSSHPort,paxSSHUsername,paxSSHPassword,cmdClean)
			console.log(`Cleaning up remote workspace success`)
        } //FINALLY
        return `${paxRemoteWorkspace}/${paxName}-${currentBranch}-${jclBuildNumber}/plugin.pax`
    } //PACK
}

module.exports = pax;


/***/ }),

/***/ 862:
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

const { execSync, spawnSync } = __nccwpck_require__(81)
const InvalidArgumentException = __nccwpck_require__(18)
const fs = __nccwpck_require__(147)
const semver = __nccwpck_require__(111)

class utils {

    static dateTimeNow() {
        return (new Date()).toISOString().split('.')[0].replace(/[^0-9]/g, "")
    }

    static sh(cmd) {
        return execSync(cmd).toString().trim()
    }

    static sh_heavyload(cmd) {
        spawnSync(cmd, { stdio: 'inherit', shell: true})
    }

    static fileExists(path) {
        try {
            fs.accessSync(path, fs.constants.F_OK)
            console.log(`${path} exists :D `)
            return true
        } catch {
            console.warn(`${path} does not exist :(`)
            return false
        }
    }

    static mandatoryInputCheck(varArg, inputName) {
        if (!varArg || varArg == '') {
            throw new InvalidArgumentException(inputName)
        }
    }

    static parseFileExtension(file) {
        var result = new Map()
        var KNOWN_DOUBLE_EXTS = ['.tar.gz', '.pax.Z']

        var baseName = file.lastIndexOf('/') != -1 ? file.substring(file.lastIndexOf('/')+1) : file

        var idx = -1

        // some file names end with .tar.gz we want to keep
        KNOWN_DOUBLE_EXTS.forEach( ext => {
            if (baseName.endsWith(ext)) {
                idx = baseName.length - ext.length
            }
        })

        if (idx == -1) {
            idx = baseName.lastIndexOf('.')
        }

        if (idx != -1) {
            result.set('name', baseName.substring(0,idx))
            result.set('ext', baseName.substring(idx))
        } else {
            result.set('name', baseName)
            result.set('ext', '')
        }

        return result
    }

    static parseSemanticVersion(version) {
        var versionJson = {}
        versionJson['major'] = semver.major(version)
        versionJson['minor'] = semver.minor(version)
        versionJson['patch'] = semver.patch(version)
        var prerelease = semver.prerelease(version)
        if (prerelease)
            versionMap['prerelease'] = ''+prerelease[0]+prerelease[1]
        return versionJson
    }

    static printMap (map) {
        for (const [key, value] of map.entries()) {
            console.log(`${key}: ${value ? value : 'null'}`);
        }
    }

    static nvmShellInit(nodeJsVersion) {
        var nvmScript = `${process.env.HOME}/.nvm/nvm.sh`
        var cmds = new Array()
        cmds.push(`set +x`)
        cmds.push(`. ${nvmScript}`)
        cmds.push(`nvm install ${nodeJsVersion}`)
        cmds.push(`npm install npm -g`)
        cmds.push(`npm install yarn -g`)
        cmds.push(`npm install ci -g`)
        return this.sh(cmds.join(' && '))
    }

    static nvmShell(nodeJsVersion, scripts) {
        var nvmScript = `${process.env.HOME}/.nvm/nvm.sh`
        var cmds = new Array()
        cmds.push(`set +x`)
        cmds.push(`. ${nvmScript}`)
        cmds.push(`nvm use ${nodeJsVersion}`)
        cmds.push(`set -x`)
        scripts.forEach(x => {
            cmds.push(x)
        });
        return this.sh(cmds.join(' && '))
    }

    static sanitizeBranchName(branch) {
        if (branch.startsWith('origin/')) {
            branch = branch.substring(7)
        }
        branch = branch.replace(/[^a-zA-Z0-9]/g, '-')
                       .replace(/[\-]+/g, '-')
                       .toLowerCase()
        return branch
    }

    static searchDefaultBranches() {
        var defaultBranchesJsonObject = JSON.parse(process.env.DEFAULT_BRANCHES_JSON_TEXT)
        for (var i=0; i < defaultBranchesJsonObject.length; i++) {
            var branch = defaultBranchesJsonObject[i]
            if (process.env.CURRENT_BRANCH === branch.name || process.env.CURRENT_BRANCH.match(branch.name)) {
                return branch
            }
        }
    }

    static sftp(host, port, username, passwd, cmds) {
        var fullCMD = `SSHPASS=${passwd} sshpass -e sftp -o BatchMode=no -o StrictHostKeyChecking=no -P ${port} -b - ${username}@${host} <<EOF
${cmds}
EOF`
        this.sh_heavyload(fullCMD)
    }

    static sftpKeyFile(server, keyPassPhrase, cmds) {
        var fullCMD = `SSHPASS=${keyPassPhrase} sshpass -e -P "passphrase for key" sftp ${server} <<EOF
${cmds}
exit 0
EOF`
        this.sh_heavyload(fullCMD)
    }

    static ssh(host, port, username, passwd, cmds) {
        var fullCMD = `SSHPASS=${passwd} sshpass -e ssh -tt -o StrictHostKeyChecking=no -p ${port} ${username}@${host} <<EOF
${cmds}
exit 0
EOF`
        this.sh_heavyload(fullCMD)
    }

    static sshKeyFile(server, keyPassPhrase, cmds) {
        var fullCMD = `SSHPASS=${keyPassPhrase} sshpass -e -P "passphrase for key" ssh ${server} <<EOF
${cmds}
exit 0
EOF`
        this.sh_heavyload(fullCMD)
    }
}

module.exports = utils;

/***/ }),

/***/ 471:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


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
/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const core = __nccwpck_require__(471)
const utils = __nccwpck_require__(862)
const pax = __nccwpck_require__(666)
const Debug = __nccwpck_require__(380)
const debug = Debug('zowe-actions:shared-actions:packaging')

// Defaults
const projectRootPath = process.env.GITHUB_WORKSPACE
const jclBuildNumber = process.env.JFROG_CLI_BUILD_NUMBER
const currentBranch = process.env.CURRENT_BRANCH
const mvdHomeDir = process.env.MVD_HOME_DIR
const maristNode = process.env.MARIST_NODE

// Gets inputs
const paxSSHHost = core.getInput('pax-ssh-host')
const paxSSHPort = core.getInput('pax-ssh-port')
const paxSSHUsername = core.getInput('pax-ssh-username')
const paxSSHPassword = core.getInput('pax-ssh-password')
const paxOptions = core.getInput('pax-options')
var paxLocalWorkspace = core.getInput('pax-local-workspace')
var paxRemoteWorkspace = core.getInput('pax-remote-workspace')
var paxName = core.getInput('pax-name')
const extraFiles = core.getInput('extra-files')

paxLocalWorkspace = `${projectRootPath}/${paxLocalWorkspace}`

// null check
utils.mandatoryInputCheck(paxSSHUsername, 'pax-ssh-username')
utils.mandatoryInputCheck(paxSSHPassword, 'pax-ssh-password')

core.setSecret(paxSSHUsername.toUpperCase())  //this is to prevent uppercased username to be showing in the log
// Real work starts now
console.log(`Creating pax file "${paxName}" from workspace...`)

var args = new Map()

args.set('job',`pax-packaging-${paxName}`)
args.set('paxSSHHost',paxSSHHost)
args.set('paxSSHPort',paxSSHPort)
args.set('paxSSHUsername',paxSSHUsername)
args.set('paxSSHPassword',paxSSHPassword)
args.set('paxOptions',paxOptions)
args.set('extraFiles',extraFiles)
args.set('paxLocalWorkspace',paxLocalWorkspace)
args.set('paxRemoteWorkspace',paxRemoteWorkspace)
args.set('paxName',paxName)
args.set('jclBuildNumber',jclBuildNumber)
args.set('currentBranch',currentBranch)
args.set('mvdHomeDir',mvdHomeDir)
args.set('maristNode',maristNode)

pax.pack(args)
})();

module.exports = __webpack_exports__;
/******/ })()
;
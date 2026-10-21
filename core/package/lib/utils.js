/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const { execSync, spawnSync } = require('child_process')
const InvalidArgumentException = require('./invalid-argument-exception.js')
const fs = require('fs')
const semver = require('semver')

class utils {

    static dateTimeNow() {
        return (new Date()).toISOString().split('.')[0].replace(/[^0-9]/g, "")
    }

    static sh(cmd) {
        return execSync(cmd).toString().trim()
    }

    static sh_heavyload(prog, args, stdin, envs) {
        spawnSync(prog, args, {
            input: stdin,
            env: envs,
            stdio: ['pipe', 'inherit', 'inherit'],
            shell: false
        })
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
        this.sh_heavyload(
            "sshpass",
            ['-e', 'sftp', '-o', 'BatchMode=no', '-o', 'StrictHostKeyChecking=no', '-P', `${port}`, '-b', '-', '--', `${username}@${host}`],
            cmds + "\n",
            {...process.env, SSHPASS: passwd}
        )
    }

    static sftpKeyFile(server, keyPassPhrase, cmds) {
        this.sh_heavyload(
            "sshpass",
            ['-e', '-P', 'passphrase for key', 'sftp', `${server}`],
            cmds + "\nexit 0\n",
            {...process.env, SSHPASS: keyPassPhrase}
        )
    }

    static ssh(host, port, username, passwd, cmds) {
        this.sh_heavyload(
            "sshpass",
            ['-e', 'ssh', '-tt', '-o', 'StrictHostKeyChecking=no', '-p', `${port}`, '--', `${username}@${host}`],
            cmds + "\nexit 0\n",
            {...process.env, SSHPASS: passwd}
        )

    }

    static sshKeyFile(server, keyPassPhrase, cmds) {
        this.sh_heavyload(
            "sshpass",
            ['-e', '-P', 'passphrase for key', 'ssh', `${server}`],
            cmds + "\nexit 0\n",
            {...process.env, SSHPASS: keyPassPhrase}
        )
    }
}

module.exports = utils;
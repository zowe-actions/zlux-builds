/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const { spawnSync } = require('child_process')
const fs = require('fs')
const utils = require('./utils.js')

const SAFE_REF = /^[A-Za-z0-9._/-]+$/
const SAFE_REPO = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/

class github {

    /**
     * Reject a branch name that is not a plain git ref, since it is passed to git commands
     *
     * @param  ref             the branch name to check
     * @param  what            description of the value, used in the error message
     */
    static assertSafeRef(ref, what) {
        if (typeof ref !== 'string' || !SAFE_REF.test(ref) || ref !== ref.trim() || ref.startsWith('-') || ref.includes('..')) {
            throw new Error(`Invalid ${what}: only letters, digits, '.', '_', '-' and '/' are allowed, it must not start with '-' or contain '..'`)
        }
    }

    /**
     * Reject a repository name that is not in the form owner/name
     *
     * @param  repo            the repository name to check
     */
    static assertSafeRepo(repo) {
        if (typeof repo !== 'string' || !SAFE_REPO.test(repo) || repo !== repo.trim()) {
            throw new Error(`Invalid repository name: expected owner/name with letters, digits, '.', '_' and '-'`)
        }
    }

    /**
     * Run git with an argument list, without a shell
     *
     * @param  args            git arguments
     * @param  workingDir      the working directory, optional
     */
    static _spawnGit(args, workingDir) {
        const res = spawnSync('git', args, {cwd: workingDir, shell: false, stdio: ['ignore', 'pipe', 'inherit']})
        if (res.error) {
            throw res.error
        }
        if (res.status !== 0) {
            throw new Error(`git ${args[0]} failed with exit code ${res.status}`)
        }
        return res.stdout.toString().trim()
    }

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
            this.assertSafeRepo(repo)
            var args = ['clone']
            if (branch) {
                this.assertSafeRef(branch, 'branch name')
                if (shallow) {
                    args.push('--depth', '1')
                }
                args.push('--single-branch', '--branch', branch)
            }
            args.push(`https://github.com/${repo}.git`, dir)
            fs.mkdirSync(dir, {recursive: true})
            this._spawnGit(args)
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
            this.assertSafeRef(branch, 'branch name')
            if (!workingDir) {
                console.warn('Git operation skipped, must specify working directory')
                return
            }
            const res = this._spawnGit(['reset', '--hard', branch], workingDir)
            if (!quiet) {
                console.log('>>> git reset --hard', branch, '\n', res, '\n<<<')
            }
            return res
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
        if (!workingDir) {
            console.warn('Git operation skipped, must specify working directory')
            return
        }
        const res = this._spawnGit(['commit', '-s', '-m', message], workingDir)
        if (!quiet) {
            console.log('>>> git commit', '\n', res, '\n<<<')
        }
        return res
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
            this.assertSafeRef(branch, 'branch name')
            this.assertSafeRepo(repo)
            const res = this._spawnGit(['push', `https://${username}:${passwd}@github.com/${repo}`, branch], dir)
            if (!quiet) {
                console.log('>>> git push', repo, branch, '\n', res, '\n<<<')
            }
            return res
        }
    }

    /**
     * Check if current branch is synced with remote
     * 
     * @param  branch          the branch to be checked against, required
     * @param  dir             the working directory, required
     */
    static isSync(branch, dir) {
        this.assertSafeRef(branch, 'branch name')
        // update remote
        this._spawnGit(['fetch', 'origin'], dir)
        // get last hash
        var localHash = this._spawnGit(['rev-parse', '--verify', branch], dir)
        var remoteHash = this._spawnGit(['rev-parse', '--verify', `origin/${branch}`], dir)

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
            this.assertSafeRef(branch, 'branch name')
            fs.mkdirSync(dir, {recursive: true})
            this._spawnGit(['switch', '--orphan', branch], dir)
            this._spawnGit(['commit', '--allow-empty', '-m', 'Initial commit on orphan branch'], dir)
        }
    }
}

module.exports = github;
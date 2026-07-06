/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const core = require('@actions/core')
const utils = require('./lib/utils.js')
const pax = require('./lib/pax.js')
const Debug = require('debug')
const debug = Debug('zowe-actions:shared-actions:packaging')

// Defaults
const projectRootPath = process.env.GITHUB_WORKSPACE
const jclBuildNumber = process.env.JFROG_CLI_BUILD_NUMBER
const currentBranch = process.env.CURRENT_BRANCH
const mvdHomeDir = process.env.MVD_HOME_DIR
const buildZSS = process.env.BUILD_ZSS


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
args.set('buildZSS',buildZSS)

pax.pack(args)


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
const Registry = require('npm-registry')
const { InvalidArgumentException , utils } = require('zowe-common')
const Debug = require('debug')
const debug = Debug('zowe-actions:nodejs-actions:setup')

var publishRegistry
var installRegistry
var packageName
var projectRootPath = process.env.GITHUB_WORKSPACE
var repoName = process.env.REPOSITORY_NAME
var test_path = process.env.MVD_HOME_DIR
var workingDirectory = test_path + '/zlux/' + repoName + '/build/component'
if (workingDirectory != '') {
    projectRootPath += '/'+ workingDirectory 
}

// Get packageName
packageName = core.getInput('package-name')     
if (!packageName) 
    throw new InvalidArgumentException('packageName')
if (!test_path) 
    throw new InvalidArgumentException('test_path')
var packageInfo

// Configuring publishRegistry and login
if (core.getInput('publish-registry-email') != '') {
    var prEmail = core.getInput('publish-registry-email')
    var prUsername = core.getInput('publish-registry-username')
    var prPassword = core.getInput('publish-registry-password')
    var prTokenCredential = core.getInput('publish-registry-token-credential') //if username + password and token both provided, we will prioritize on token authentication
    if (prEmail && ((prUsername && prPassword) || prTokenCredential)) {
        console.log('\n>>>>>>>>>>>>>>> Init publish registry')
        var args = new Map()
        args.set('email', prEmail)
        args.set('username', prUsername)
        args.set('password', prPassword)
        args.set('tokenCredential', prTokenCredential)
        args.set('workingDirectory', workingDirectory)
        publishRegistry = new Registry(args)
        // try to extract publish registry from package.json
        publishRegistry.initFromPackageJson(args)
        packageInfo = publishRegistry.getPackageInfo()
        console.log(`- ${publishRegistry.scope ? '@'+publishRegistry.scope+':':''}${publishRegistry.registry ? publishRegistry.registry:'(WARNING: undefined publish registry)'}`)
        console.log('<<<<<<<<<<<<<<< Done init publish registry')
        console.log('\n>>>>>>>>>>>>>>> Login to publish registry')
        publishRegistry.login()
        console.log('<<<<<<<<<<<<<<< Done Login to publish registry')
    } else {         
        if (!prEmail)
            throw new InvalidArgumentException('publish-registry-email')
        if (!prTokenCredential) {
            if (prUsername || prPassword) {
                if (!prUsername)
                    throw new InvalidArgumentException('publish-registry-username')
                if (!prPassword)
                    throw new InvalidArgumentException('publish-registry-password')
            } else {
                throw new InvalidArgumentException('Either provide token for publish registry or username/password pair')
            }
        }
    }
}
// else 'publish-registry-email' is null, meaning we will skip publish registry processing
else {
    var args = new Map()
    if (workingDirectory != '') {
        args.set('workingDirectory', workingDirectory)
    }
    var myRegistry = new Registry(args)
    // try to extract publish registry from package.json
    myRegistry.initFromPackageJson(args)
    packageInfo = myRegistry.getPackageInfo()
}

// Configuring installRegistry and login

if (core.getInput('install-registry-url') != '') {
    var irUrl = core.getInput('install-registry-url')
    var irEmail = core.getInput('install-registry-email')
    var irUsername = core.getInput('install-registry-username')
    var irPassword = core.getInput('install-registry-password')
    var irTokenCredential = core.getInput('install-registry-token-credential') //if username + password and token both provided, we will prioritize on token authentication
    if (irEmail && ((irUsername && irPassword) || irTokenCredential)) {
        console.log('\n>>>>>>>>>>>>>>> Init install registry')
        var args = new Map()
        args.set('email', irEmail)
        args.set('username', irUsername)
        args.set('password', irPassword)
        args.set('tokenCredential', irTokenCredential)
        args.set('registry', irUrl)
        if (workingDirectory != '') {
            args.set('workingDirectory', workingDirectory)
        }
        installRegistry = new Registry(args)
        console.log(`- ${installRegistry.scope ? '@'+installRegistry.scope+':':''}`+ installRegistry.registry)
        console.log('<<<<<<<<<<<<<<< Done init install registry')
        console.log('\n>>>>>>>>>>>>>>> Login to install registry')
        installRegistry.login()
        console.log('<<<<<<<<<<<<<<< Done Login to install registry')
    } else {
        if (!irTokenCredential) {
            if (irUsername || irPassword) {
                if (!irUsername)
                    throw new InvalidArgumentException('install-registry-username')
                if (!irPassword)
                    throw new InvalidArgumentException('install-registry-password')
            } else {
                throw new InvalidArgumentException('Either provide token for install registry or username/password pair')
            }
        }
    }
}

if (!packageInfo.get('versionTrunks') || packageInfo.get('versionTrunks').prerelease)
    throw new Error('Version defined in package.json shouldn\'t have pre-release string or metadata, pipeline will adjust based on branch and build parameter.')
console.log(`Package information: ${packageName} v${packageInfo.get('version')}`)

// export packageInfo to a json string
// first need to convert from Map to json object
var json = {}
packageInfo.forEach((value,key) => {    
    if (value instanceof Map) {
        var json2 = {}
        value.forEach((value2,key2) => {
          json2[key2]=value2
        })
        json[key]=json2
    }
    else {
        json[key]=value
    }
})
core.exportVariable('PACKAGE_INFO',JSON.stringify(json, null, 2))

/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2021
 */

const fs = require('fs')
const { InvalidArgumentException , utils } = require('zowe-common')
const Debug = require('debug')
const debug = Debug('zowe-actions:nodejs-actions:npm-registry')
const PACKAGE_JSON = 'package.json'
//const NPMRC_FILE = '~/.npmrc'
const DEFAULT_REGISTRY = 'https://registry.npmjs.org/'

class Registry {
    packageJsonFile;
    registry;
    scope;
    email;
    tokenCredential;
    username;
    password;
    packageInfo;
    workingDirectory;

    /**
     * Initialize npm registry properties.
     *
     * @Note The below parameters are supported keys of the {@code args} Map.
     *
     * @param   registry                    the registry URL
     * @param   tokenCredential             redential ID for NPM token. Optional.
     * @param   username                    username for NPM. Optional.
     * @param   password                    password for NPM. Optional.
     * @param   email                       NPM user email
     * @param   packageJsonFile             {@code package.json} file name. Optional, default is {@link #PACKAGE_JSON}.
     * @param   workingDirectory            the directory of where package.json resides.
    */
    constructor(args) {                      
        // File name of package.json, default is 'package.json'
        if (args.get('packageJsonFile')) {
            this.packageJsonFile = args.get('packageJsonFile')
        }
        if (!this.packageJsonFile) {
            this.packageJsonFile = PACKAGE_JSON        
        }
        
        if (args.get('registry')) {
            this.registry = args.get('registry')
            // normalize registry url
            if (!this.registry.endsWith('/')) {
                this.registry += '/'
            }
            this.registry = this.registry.toLowerCase()
        }
        if (args.get('scope')) {
            this.scope = args.get('scope')
            if (this.scope.startsWith('@')) {
                this.scope = this.scope.substring(1)
            }
        }
        if (args.get('email')) {
            this.email = args.get('email')
        }
        if (args.get('tokenCredential')) {
            this.tokenCredential = args.get('tokenCredential')
        } 
        if (args.get('username')) {
            this.username = args.get('username')
        }
        if (args.get('password')) {
            this.password = args.get('password')
        }
        if (args.get('workingDirectory')) {
            this.workingDirectory = args.get('workingDirectory')
        }
    }

    /**
     * Detect npm registry and scope from {@code package.json}.
     *
     * @Note This method is taken out from {@link #init(Map)} because some registries (like install
     * registries) shouldn't have this. Only publish registry makes sense to get from
     * {@code package.json}.
     *
     * @Note Use similar parameters defined in {@link #init(Map)} method.
     */
    initFromPackageJson(args) {
        var info = this.getPackageInfo()

        if (!this.registry && info.get('registry')) {
            this.registry = info.get('registry')
        }
        if (!this.scope && info.get('scope')) {
            this.scope = info.get('scope')
        }
    }

    /**
     * Login to NPM registry.
     *
     * @Note Using token credential may receive this error with whoami, but actually npm install is ok.
     * <pre>
     * + npm whoami --registry https://zowe.jfrog.io/zowe/api/npm/npm-release/
     * npm ERR! code E401
     * npm ERR! Unable to authenticate, need: Basic realm="Artifactory Realm"
     * </pre>
     *
     * <p>This happens if we set {@code "//zowe.jfrog.io/zowe/api/npm/npm-release/:_authToken"},
     * but if we set {@code "_auth=<token>"}, everything is ok.</p>
     *
     * <p>Is this a bug of Artifactory?</p>
     *
     * <p>So for now, only usernamePasswordCredential works well.</p>
     *
     * @see <a href="https://www.jfrog.com/confluence/display/RTF/Npm+Registry#NpmRegistry-ConfiguringthenpmClientforaScopeRegistry">jFrog Artifactory - Configuring the npm Client for a Scope Registry</a>
     *
     * @Note Use similar parameters defined in {@link #init(Map)} method.
     *
     * @return                              username who login
     */
    login(args) {
        // init with arguments
        if (args && args.size() > 0) {
            this.init(args)
        }
        // validate arguments
        if (!this.registry) {
            this.registry = DEFAULT_REGISTRY
        }

        // per registry authentication in npmrc is:
        // //registry.npmjs.org/:_authToken=<token>
        // without protocol, with _authToken key
        var registryWithoutProtocol
        if (this.registry.startsWith('https://')) {
            registryWithoutProtocol = this.registry.substring(6)
        } else if (this.registry.startsWith('http://')) {
            registryWithoutProtocol = this.registry.substring(5)
        } else {
            throw new InvalidArgumentException('registry', 'Unknown registry protocol')
        }

        console.log(`Login to: ${this.registry}`)

        // create if it's not existed
        // backup current .npmrc
        // this.steps.sh "touch ${NPMRC_FILE} && mv ${NPMRC_FILE} ${NPMRC_FILE}-bak"

        // Prevent npm publish from being affected by the local npmrc file
        // FIXME: removed to pririotize local .npmrc
        // if (this.steps.fileExists('.npmrc')) {
        //     this.steps.sh "rm -f .npmrc || exit 0"
        // }

        // update auth in .npmrc
        if (this.tokenCredential) {
            var configEntries = new Array()
            configEntries.push(`set +x`)
            configEntries.push(`npm config set _auth ${this.tokenCredential}`)
            configEntries.push(`npm config set email ${this.email}`)
            configEntries.push(`npm config set always-auth true`)
            if (this.scope) {
                configEntries.push(`npm config set @${this.scope}:registry ${this.registry}`)
                configEntries.push(`npm config set ${registryWithoutProtocol}:_authToken ${this.tokenCredential}`)
                configEntries.push(`npm config set ${registryWithoutProtocol}:email ${this.email}`)
                configEntries.push(`npm config set ${registryWithoutProtocol}:always-auth true`)
            } else {
                configEntries.push(`npm config set registry ${this.registry}`)
            }
            var cmds = configEntries.join('\n')
            debug(cmds)
            debug(utils.sh(cmds))

        } else if (this.username && this.password) {
            var base64Password = Buffer.from(this.password).toString('base64')
            var usernamePasswordString = `${this.username}:${this.password}`
            var base64UsernamePassword = Buffer.from(usernamePasswordString).toString('base64')
            var configEntries = new Array()
            configEntries.push(`set +x`)
            configEntries.push(`npm config set _auth ${base64UsernamePassword}`)
            configEntries.push(`npm config set email ${this.email}`)
            configEntries.push(`npm config set always-auth true`)
            if (this.scope) {
                configEntries.push(`npm config set @${this.scope}:registry ${this.registry}`)
                configEntries.push(`npm config set ${registryWithoutProtocol}:username ${this.username}`)
                configEntries.push(`npm config set ${registryWithoutProtocol}:_password ${base64Password}`)
                configEntries.push(`npm config set ${registryWithoutProtocol}:email ${this.email}`)
                configEntries.push(`npm config set ${registryWithoutProtocol}:always-auth true`)
            } else {
                configEntries.push(`npm config set registry ${this.registry}`)
            }
            var cmds = configEntries.join('\n')
            debug(cmds)
            debug(utils.sh(cmds))
        }

        // debug info: npm configs
        var cmds = `npm config list`
        debug(cmds)
        debug(utils.sh(cmds))
        
        // get login information
        var cmds = `npm whoami --registry ${this.registry}`
        debug(cmds)
        var out = utils.sh(cmds)
        debug(out)
        return out
    }

    /**
     * Get current package information from {@code package.json}.
     *
     * @Note This method has cache. If you need to reload package info from package.json, run method
     * {@link #clearPackageInfoCache()} to reset the cache.
     *
     * <p><strong>Expected keys in the result Map:</strong><ul>
     * <li>{@code name} - name of the package. For example, {@code "explorer-jes"}.</li>
     * <li>{@code scope} - scope of the package. Optional. For example, {@code "zowe"}. Please note this value does <strong>NOT
     *     </strong> have <strong>{@literal @}</strong> included.</li>
     * <li>{@code description} - description of the package if defined. For example, {@code "A UI plugin to handle z/OS jobs."}.</li>
     * <li>{@code version} - version of the package. For example, {@code "1.2.3"}.</li>
     * <li>{@code versionTrunks} - Map version trunks returned from {@link jenkins_shared_library.Utils#parseSemanticVersion(java.lang.String)}.</li>
     * <li>{@code license} - license of the package if defined. For example, {@code "EPL-2.0"}.</li>
     * <li>{@code registry} - publish registry of the package if defined.</li>
     * <li>{@code scripts} - List of scripts of the package defined. For example, {@code ["build", "test", "start", "coverage"]}.</li>
     * </ul></p>
     *
     * @return             current package information including name, version, description, license, etc
     */
    getPackageInfo() {
        if (this.packageInfo) {
            return this.packageInfo
        }
        
        var info = new Map()
        var packageJsonFileFullPath
        if (this.workingDirectory) {
            packageJsonFileFullPath = `${this.workingDirectory}/${this.packageJsonFile}`
        }
        else {
            packageJsonFileFullPath = `${process.env.GITHUB_WORKSPACE}/${this.packageJsonFile}`
        }
        if (this.packageJsonFile && utils.fileExists(packageJsonFileFullPath)) {
            var pkg = JSON.parse(fs.readFileSync(packageJsonFileFullPath));
            
            if (pkg) {
                if (pkg['name']) {
                    info.set('name',pkg['name'])
                    var myRegex = /^@([^\/]+)\/(.+)$/
                    var regexMatchArray = myRegex.exec(info.get('name'))
                    if (regexMatchArray != null) {
                        info.set('scope', regexMatchArray[1])
                        this.scope = info.get('scope')
                        info.set('name', regexMatchArray[2])
                    }
                }
                if (pkg['description']) {
                    info.set('description', pkg['description'])
                }
                if (pkg['version']) {
                    info.set('version', pkg['version'])
                    info.set('versionTrunks', utils.parseSemanticVersion(info.get('version')))
                }
                if (pkg['license']) {
                    info.set('license', pkg['license'])
                }
                if (pkg['publishConfig'] && pkg['publishConfig']['registry']) {
                    info.set('registry', pkg['publishConfig']['registry'])
                }
                if (pkg['scripts']) {
                    var scripts = pkg['scripts']
                    var arr = []                    
                    for (var k in scripts) {
                        if (scripts.hasOwnProperty(k)) {
                            var v = scripts[k];
                            arr.push(k)
                        }
                    }  
                    info.set('scripts', arr)
                }
            }
        } else {
            console.err(`packageJsonFile 111is not defined or file ${this.packageJsonFile} doesn't not exist.`)
        }
        this.packageInfo = info
        debug(info)
        return info
    }
}
module.exports = Registry;
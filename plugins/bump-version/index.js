const core = require('@actions/core')
const utils = require('./lib/utils.js')
const github = require('./lib/github.js')
const Debug = require('debug')
const actionsGithub = require('@actions/github')



var version = core.getInput('version')
var branch = core.getInput('branch')
var repo = actionsGithub.context.repo.owner + '/' + actionsGithub.context.repo.repo

if (branch == ''){
	// Default to v3 but can be overridden via input
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

// run npm version
console.log(`Making a "${version}" version bump ...`)


//test 
var newVersion
var res
var workdir = tempFolder;
var manifest
var pluginDef


// bump package.json 
packageNames = utils.findAllFiles(`${workdir}`, 'package.json')
packageDir = packageNames.split(' ')
for (let i = 0; i < packageDir.length; i++){
	utils.bumpPackageVersion(`${workdir}/${packageDir[i]}`,version)
	console.log(utils.sh(`cat ${workdir}/${packageDir[i]}`));
}

// bump manifest 
if (utils.fileExists(workdir + '/manifest.yaml')) {
	manifest = 'manifest.yaml'
} else if (utils.fileExists(workdir + '/manifest.yml')) {
	manifest = 'manifest.yml'
} else if (utils.fileExists(workdir + '/manifest.json')) {
	throw new Error('Bump version on manifest.json is not supported yet.')
} else {
	throw new Error('No manifest found.')
}


// bump pluginDefintion.json
pluginDef = utils.findAllFiles(`${workdir}`, 'pluginDefinition.json')
pluginDefDir = pluginDef.split(' ')
for (let i = 0; i < pluginDefDir.length; i++){
	utils.bumpPackageJson(`${workdir}/${pluginDefDir[i]}`, version)
}


newVersion = utils.bumpManifestVersion(`${workdir}/${manifest}`, version)
console.log('New version:', newVersion)
github._cmd(tempFolder, 'status');
github._cmd(tempFolder, 'diff');
github.add(workdir, 'manifest.yaml')
github.add(workdir, 'pluginDefinition.json')
for (let i = 0; i < packageDir.length; i++){
	github.add(workdir, ` -f ${packageDir[i]}`)
}
for (let i = 0; i < pluginDefDir.length; i++){
	github.add(workdir, ` -f ${pluginDefDir[i]}`)
}
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
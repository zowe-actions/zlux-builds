const core = require('@actions/core')
const utils = require('./lib/utils.js')
const github = require('./lib/github.js')
const Debug = require('debug')
const actionsGithub = require('@actions/github')


var version = core.getInput('VERSION')
var branch = core.getInput('BRANCH-NAME')
var repo_name = process.env.REPO_NAME
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
console.log(`Making a "${version}" version bump ...`)

//test 
var newVersion
var res
var workdir = tempFolder;
var manifest
var pluginDef



// bump *.env 
envFileNames = utils.findAllFiles(`${workdir}`, '*.env')
packageDir = envFileNames.split(' ')

for (let i = 0; i < packageDir.length; i++){
	utils.bumpEnvVersion(`${workdir}/${packageDir[i]}`,version)
	console.log(utils.sh(`cat ${workdir}/${packageDir[i]}`));
}


//bump dynamic verion
if (repo_name == 'zss') {
    utils.bumpDynamicVersion(`${workdir}/build/zis.proj.env`)
	console.log(utils.sh(`cat ${workdir}/build/zis.proj.env`));
}

// bump manifest 
if (utils.fileExists(workdir + '/manifest.template.yaml')) {
	manifest = 'manifest.template.yaml'
} else if (utils.fileExists(workdir + '/manifest.template.yml')) {
	manifest = 'manifest.template.yml'
} else if (utils.fileExists(workdir + '/manifest.template.json')) {
	throw new Error('Bump version on manifest.template.json is not supported yet.')
} else {
	throw new Error('No manifest found.')
}

newVersion = utils.bumpManifestVersion(`${workdir}/${manifest}`, version)
console.log(utils.sh(`cat ${workdir}/${manifest}`));
console.log('New version:', newVersion)
github._cmd(tempFolder, 'status');
github._cmd(tempFolder, 'diff');
github.add(workdir, `${manifest}`)

for (let i = 0; i < packageDir.length; i++){
	github.add(workdir, ` -f ${packageDir[i]}`)
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

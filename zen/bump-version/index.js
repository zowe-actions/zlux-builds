const core = require('@actions/core')
const utils = require('./lib/utils.js')
const github = require('./lib/github.js')
const Debug = require('debug')
const actionsGithub = require('@actions/github')



var version = core.getInput('version')
var branch = core.getInput('branch')
var repo = actionsGithub.context.repo.owner + '/' + actionsGithub.context.repo.repo

if (branch == ''){
	branch = 'v2.x/staging'
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
utils.bumpPackageVersion(`${workdir}/package.json`,version)
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
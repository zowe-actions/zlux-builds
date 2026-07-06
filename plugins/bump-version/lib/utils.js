const { execSync, spawnSync } = require('child_process')
const fs = require('fs')
const semver = require('semver') 

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
	
	static bumpManifestVersion(manifest, version) {
        if (version == '') {
            version = 'MINOR';
        }

        const oldVersionLine = this.sh(`cat ${manifest} | grep 'version:'`);
        if (!oldVersionLine) {
            console.log(`Version is not defined in ${manifest}`);
            return;
        }
        const oldVersion = oldVersionLine.split(':')[1].trim();
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

        const manifestContent = fs.readFileSync(manifest).toString();
        fs.writeFileSync(manifest, manifestContent.replace(/^version:.*$/m, `version: ${newVersion}`));

        return `v${newVersion}`;
    }
	
	static findAllFiles(directory, pname){
		const packageNames = utils.sh(`cd ${directory} && echo $(find . -name ${pname} | { grep -v node_modules || true; })`);
		return packageNames
	}
	
	static bumpPackageVersion(packageFile, version){
		if (version == '') {
            version = 'MINOR';
        }
		
		if (version == 'PATCH'){
			this.sh(`sh -c "cd \`dirname ${packageFile}\` && npm version patch --force"`)
		} else if (version == 'MINOR'){
			this.sh(`sh -c "cd \`dirname ${packageFile}\` && npm version minor --force"`)
		} else if (version == 'MAJOR'){
			this.sh(`sh -c "cd \`dirname ${packageFile}\` && npm version major --force"`)
		} else {
			console.log(`Error: version seems to be missing`)
		}
	}
	
	static bumpPackageJson(packageFile, version){
		if (version == '') {
            version = 'MINOR';
        }
		
		const oldVersion = this.sh(`grep '"pluginVersion"' ${packageFile} | cut -d '"' -f 4 | head -n 1`);
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
		const newData = data.replace(`"pluginVersion": "${oldVersion}"`, `"pluginVersion": "${newVersion}"`)
		fs.writeFileSync(`${packageFile}`, newData);
		
	}
	
}


module.exports = utils;

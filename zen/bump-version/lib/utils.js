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
	
	static findAllFiles(directory, pname){
		const packageNames = utils.sh(`cd ${directory} && echo $(find . -name ${pname} | { grep -v node_modules || true; })`);
		return packageNames
	}
	
	
	static bumpPackageJson(packageFile, version){
		if (version == '') {
            version = 'MINOR';
        }
		
		const oldVersion = this.sh(`grep '"version"' ${packageFile} | cut -d '"' -f 4 | head -n 1`);
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
		const newData = data.replace(`"version": "${oldVersion}"`, `"version": "${newVersion}"`)
		fs.writeFileSync(`${packageFile}`, newData);
		
	}
	
	static getNewVersion(packageFile){
		const version = this.sh(`grep '"version"' ${packageFile} | cut -d '"' -f 4 | head -n 1`);
		return `${version}`;
	}
}


module.exports = utils;

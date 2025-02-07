const fs = require('fs')
const Debug = require('debug')
const InvalidArgumentException = require('./invalid-argument-exception.js')
const utils = require('./utils.js')
const PATH_CONTENT = 'content'
const PATH_ASCII = 'ascii'

class pax{


    static pack(args) {
        const func = 'pack:'
        const job = args.get('job')
        const paxSSHHost = args.get('paxSSHHost')
        const paxSSHPort = args.get('paxSSHPort')
        const paxSSHUsername = args.get('paxSSHUsername')
        const paxSSHPassword = args.get('paxSSHPassword') 
        const filename = args.get('filename')
        const paxOptions = args.get('paxOptions')
        const extraFilesArg = args.get('extraFiles')
        var environmentText = args.get('environments')
        const compress = args.get('compress')
        const compressOptions = args.get('compressOptions')
        var keepTempFolderArg = false
		const currentBranch = args.get('currentBranch')
		const jclBuildNumber = args.get('jclBuildNumber')
		const paxName = args.get('paxName')
		const mvdHomeDir = args.get('mvdHomeDir')
		const maristNode = args.get('maristNode')
		

        var paxLocalWorkspace = args.get('paxLocalWorkspace')
        var paxRemoteWorkspace = args.get('paxRemoteWorkspace')
		var paxPackageDir = args.get('paxPackageDir')

        // validate arguments
        if (!paxSSHHost) {
            throw new InvalidArgumentException('paxSSHHost')
        }
        if (!paxSSHPort) {
            throw new InvalidArgumentException('paxSSHPort')
        }
        if (!paxSSHUsername) {
            throw new InvalidArgumentException('paxSSHUsername')
        }
        if (!paxSSHPassword) {
            throw new InvalidArgumentException('paxSSHPassword')
        }
        if (!job) {
            throw new InvalidArgumentException('job')
        }
        if (!paxLocalWorkspace){
            throw new InvalidArgumentException('paxLocalWorkspace')
        }
        if (!paxRemoteWorkspace){
            throw new InvalidArgumentException('paxRemoteWorkspace')
        }
		if (!currentBranch){
            throw new InvalidArgumentException('currentBranch')
        }
		if (!jclBuildNumber){
            throw new InvalidArgumentException('jclBuildNumber')
        }
		if (!paxName){
            throw new InvalidArgumentException('paxName')
        }
		if (!mvdHomeDir){
            throw new InvalidArgumentException('mvdHomeDir')
        }
		if (!maristNode){
			throw new InvalidArgumentException('maristNode')
		}
		
		try {
            // Step 1: make packaging folder
			console.log('We are using new container')
			var cmd = `rm -rf ${paxRemoteWorkspace}/${paxName}-${currentBranch}-${jclBuildNumber} && mkdir -p ${paxRemoteWorkspace}/${paxName}-${currentBranch}-${jclBuildNumber}`
            utils.ssh(paxSSHHost,paxSSHPort,paxSSHUsername,paxSSHPassword,cmd)
            console.log(`[Step 1]: make folder created `)

            // Step 2: sand tar files over
			var cmd2 = `put ${mvdHomeDir}/zowe-install-packaging/bin/utils/tag-files.sh ${paxRemoteWorkspace}/${paxName}-${currentBranch}-${jclBuildNumber}/tag-files.sh
put ${mvdHomeDir}/zlux.tar ${paxRemoteWorkspace}/${paxName}-${currentBranch}-${jclBuildNumber}/zlux.tar			`
			utils.sftp(paxSSHHost,paxSSHPort,paxSSHUsername,paxSSHPassword,cmd2)
            console.log(`[Step 2]: sftp put zlux.tar and tag-files.sh completed`)

			// step 3: package
            var cmd3 = `cd ${paxRemoteWorkspace}/${paxName}-${currentBranch}-${jclBuildNumber}
export _BPXK_AUTOCVT=ON
chtag -tc iso8859-1 tag-files.sh 
chmod +x tag-files.sh 
mkdir -p zlux/share && cd zlux 
mkdir bin && cd share 
tar xpoUf ../../zlux.tar 
../../tag-files.sh . 
cd zlux-server-framework 
rm -rf node_modules 
export NODE_HOME=${maristNode}
_TAG_REDIR_ERR=txt _TAG_REDIR_IN=txt _TAG_REDIR_OUT=txt __UNTAGGED_READ_MODE=V6 PATH=${maristNode}/bin:.:/bin npm --verbose install --cache /ZOWE/tmp/.npm
cd .. 
iconv -f iso8859-1 -t 1047 zlux-app-server/defaults/serverConfig/server.json > zlux-app-server/defaults/serverConfig/server.json.1047 
mv zlux-app-server/defaults/serverConfig/server.json.1047 zlux-app-server/defaults/serverConfig/server.json 
chtag -tc 1047 zlux-app-server/defaults/serverConfig/server.json 
cd zlux-app-server/bin 
cp start.sh configure.sh ../../../bin 
if [ -e "validate.sh" ]; then
  cp validate.sh ../../../bin
fi
cd ..
if [ -e "manifest.yaml" ]; then
  cp manifest.yaml ../../
fi
if [ -d "schemas" ]; then
  cp -r schemas ../../
fi
cd ../../
chmod -R 755 *
pax -o saveext -pp -wf ../zlux.pax *`
            utils.ssh(paxSSHHost,paxSSHPort,paxSSHUsername,paxSSHPassword,cmd3)
            console.log('[Step 3]: packaging completed')
			
			// step 4: copy back pax file
			var cmd4 = `get ${paxRemoteWorkspace}/${paxName}-${currentBranch}-${jclBuildNumber}/zlux.pax ${mvdHomeDir}/zlux.pax`
			utils.sftp(paxSSHHost,paxSSHPort,paxSSHUsername,paxSSHPassword,cmd4)
            console.log('[Step 4]: copy back files completed')
			
        } catch (ex1) {
            // throw error
            throw new Error(`Pack Pax package failed: ${ex1}`)
        } finally {
			console.log('cleaning up all temporary')
			var cmdClean = `rm -rf ${paxRemoteWorkspace}/${paxName}-${currentBranch}-${jclBuildNumber}`
			utils.ssh(paxSSHHost,paxSSHPort,paxSSHUsername,paxSSHPassword,cmdClean)
			console.log(`Cleaning up remote workspace success`)
        } //FINALLY
        return `${paxRemoteWorkspace}/${paxName}-${currentBranch}-${jclBuildNumber}/plugin.pax`
    } //PACK
}

module.exports = pax;

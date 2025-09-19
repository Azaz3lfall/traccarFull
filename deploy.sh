#!/bin/zsh

rm -rf build build.tar.gz
npm run build
tar czvf build.tar.gz build

ssh -i /Users/codeartisan/github_vps_key root@codeartisan.cloud "rm -rf /opt/traccar/web"
scp -i /Users/codeartisan/github_vps_key ./build.tar.gz root@codeartisan.cloud:/opt/traccar
ssh -i /Users/codeartisan/github_vps_key root@codeartisan.cloud "tar xzvf /opt/traccar/build.tar.gz -C /opt/traccar"
ssh -i /Users/codeartisan/github_vps_key root@codeartisan.cloud "mv /opt/traccar/build /opt/traccar/web"

ssh -i /Users/codeartisan/github_vps_key root@codeartisan.cloud "ls /opt/traccar/web"

ssh -i /Users/codeartisan/github_vps_key root@codeartisan.cloud "systemctl restart traccar"

#ssh -i /Users/codeartisan/github_vps_key root@codeartisan.cloud "mkdir -p /opt/traccar/web"
#scp -i /Users/codeartisan/github_vps_key -r ./build/* root@codeartisan.cloud:/opt/traccar/web



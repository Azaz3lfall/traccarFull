#!/bin/zsh

rm -rf build build.tar.gz
# VITE_RESELLERS_SERVER_URL=https://resellers.codeartisan.cloud 
npm run build
tar czvf build.tar.gz build

ssh -i /Users/codeartisan/github_vps_key root@codeartisan.cloud "rm -rf /opt/traccar/web"
scp -i /Users/codeartisan/github_vps_key ./build.tar.gz root@codeartisan.cloud:/opt/traccar
ssh -i /Users/codeartisan/github_vps_key root@codeartisan.cloud "tar xzvf /opt/traccar/build.tar.gz -C /opt/traccar"
ssh -i /Users/codeartisan/github_vps_key root@codeartisan.cloud "mv /opt/traccar/build /opt/traccar/web"

ssh -i /Users/codeartisan/github_vps_key root@codeartisan.cloud "ls /opt/traccar/web"

# Install dependencies and manage resellersServer with PM2
ssh -i /Users/codeartisan/github_vps_key root@codeartisan.cloud "cd /opt/traccar/web/addons/reseller && yarn"
ssh -i /Users/codeartisan/github_vps_key root@codeartisan.cloud "pm2 stop resellersServer || true"
ssh -i /Users/codeartisan/github_vps_key root@codeartisan.cloud "pm2 delete resellersServer || true"
ssh -i /Users/codeartisan/github_vps_key root@codeartisan.cloud "cd /opt/traccar/web/addons/reseller && pm2 start /opt/traccar/web/addons/reseller/resellersServer.mjs --name resellersServer"
ssh -i /Users/codeartisan/github_vps_key root@codeartisan.cloud "pm2 save"
ssh -i /Users/codeartisan/github_vps_key root@codeartisan.cloud "pm2 startup"

ssh -i /Users/codeartisan/github_vps_key root@codeartisan.cloud "systemctl restart traccar"



#ssh -i /Users/codeartisan/github_vps_key root@codeartisan.cloud "mkdir -p /opt/traccar/web"
#scp -i /Users/codeartisan/github_vps_key -r ./build/* root@codeartisan.cloud:/opt/traccar/web

rm -rf build build.tar.gz


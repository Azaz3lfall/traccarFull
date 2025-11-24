#!/bin/zsh

HOST="codeartisan.cloud"
PASSWORD="F@z3rF@z3r2025"

rm -rf build build.tar.gz
# VITE_RESELLERS_SERVER_URL=https://resellers.codeartisan.cloud 
npm run build
tar czvf build.tar.gz build

sshpass -p "$PASSWORD" ssh root@$HOST "rm -rf /opt/traccar/web"
sshpass -p "$PASSWORD" scp ./build.tar.gz root@$HOST:/opt/traccar
sshpass -p "$PASSWORD" ssh root@$HOST "tar xzvf /opt/traccar/build.tar.gz -C /opt/traccar"
sshpass -p "$PASSWORD" ssh root@$HOST "mv /opt/traccar/build /opt/traccar/web"

sshpass -p "$PASSWORD" ssh root@$HOST "ls /opt/traccar/web"

# Install dependencies and restart resellersServer
sshpass -p "$PASSWORD" ssh root@$HOST "source ~/.nvm/nvm.sh && nvm use v22.14.0 && export PATH=\$PATH && cd /opt/traccar/web/addons/reseller && yarn --update-env"
sshpass -p "$PASSWORD" ssh root@$HOST "pm2 restart resellersServer"

sshpass -p "$PASSWORD" ssh root@$HOST "systemctl restart traccar"



#sshpass -p "$PASSWORD" ssh root@$HOST "mkdir -p /opt/traccar/web"
#sshpass -p "$PASSWORD" scp -r ./build/* root@$HOST:/opt/traccar/web

rm -rf build build.tar.gz


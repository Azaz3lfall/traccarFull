#!/bin/zsh

# Define hosts and passwords arrays (must have the same number of elements)
HOSTS=("rast.rastreadorautoram.com.br")
PASSWORDS=("fallen292935")

# Validate that arrays have the same length
if [ ${#HOSTS[@]} -ne ${#PASSWORDS[@]} ]; then
    echo "Error: HOSTS and PASSWORDS arrays must have the same number of elements"
    exit 1
fi

# Build once for all hosts
rm -rf build build.tar.gz
# VITE_RESELLERS_SERVER_URL=https://revendas.rastreadorautoram.com.br
npm run build
tar czvf build.tar.gz build

# Deploy to each host
for i in {1..${#HOSTS[@]}}; do
    HOST="${HOSTS[$i]}"
    PASSWORD="${PASSWORDS[$i]}"
    
    if [ -z "$HOST" ] || [ -z "$PASSWORD" ]; then
        echo "Warning: Host or password missing at index $i, skipping..."
        continue
    fi
    
    echo "Deploying to $HOST..."
    
    sshpass -p "$PASSWORD" ssh root@$HOST "rm -rf /opt/traccar/web"
    sshpass -p "$PASSWORD" scp ./build.tar.gz root@$HOST:/opt/traccar
    sshpass -p "$PASSWORD" ssh root@$HOST "tar xzvf /opt/traccar/build.tar.gz -C /opt/traccar"
    sshpass -p "$PASSWORD" ssh root@$HOST "mv /opt/traccar/build /opt/traccar/web"
    
    sshpass -p "$PASSWORD" ssh root@$HOST "ls /opt/traccar/web"
    
    # Install dependencies and restart resellersServer
    sshpass -p "$PASSWORD" ssh root@$HOST "source ~/.nvm/nvm.sh && nvm use v22.14.0 && export PATH=\$PATH && cd /opt/traccar/web/addons/reseller && yarn --update-env"
    sshpass -p "$PASSWORD" ssh root@$HOST "pm2 restart resellersServer"
    
    sshpass -p "$PASSWORD" ssh root@$HOST "systemctl restart traccar"
    
    echo "Deployment to $HOST completed!"
done



#sshpass -p "$PASSWORD" ssh root@$HOST "mkdir -p /opt/traccar/web"
#sshpass -p "$PASSWORD" scp -r ./build/* root@$HOST:/opt/traccar/web

rm -rf build build.tar.gz


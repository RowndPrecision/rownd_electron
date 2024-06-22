# #!/bin/bash

sudo setcap cap_net_admin,cap_net_raw+eip /opt/CNCjs/cncjs-app
sudo chmod 4755 /opt/CNCjs/chrome-sandbox
# sudo chown root:root /opt/CNCjs/chrome-sandbox

echo "/opt/CNCjs" | sudo tee /etc/ld.so.conf.d/electron.conf
sudo ldconfig

sudo mkdir -p /opt/CNCjs/resources/app/server/services/phonebleconnection/files
sudo chown -R rownd /opt/CNCjs/resources/app/server/services/phonebleconnection/files
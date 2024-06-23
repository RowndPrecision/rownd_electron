# #!/bin/bash

sudo setcap cap_net_admin,cap_net_raw+eip /opt/Rownd/rownd-app
sudo chmod 4755 /opt/Rownd/chrome-sandbox
# sudo chown root:root /opt/Rownd/chrome-sandbox

echo "/opt/Rownd" | sudo tee /etc/ld.so.conf.d/electron.conf
sudo ldconfig

sudo mkdir -p /opt/Rownd/resources/app/server/services/phonebleconnection/files
sudo chown -R rownd /opt/Rownd/resources/app/server/services/phonebleconnection/files
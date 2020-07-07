#!/bin/bash

# creates sel-signed test certificate

# use the unofficial bash strict mode. This causes bash to behave in a way that makes many classes of subtle bugs impossible.
# http://redsymbol.net/articles/unofficial-bash-strict-mode/
set -euo pipefail

# create cert .pem public file and .key private key
openssl req -newkey rsa:4096 \
            -x509 \
            -sha256 \
            -days 3650 \
            -nodes \
            -out testCert.pem \
            -keyout testCert.key

# grant permissions to allow ither users (not only root) read the certs
sudo chmod o+r testCert.key testCert.pem

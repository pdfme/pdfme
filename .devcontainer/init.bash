#!/bin/bash

set -eu
cd $(dirname $0)

cd ../
sed -i -e 's#git@github.com:#https://github.com/#g' .gitmodules
sed -i -e 's#git@github.com:#https://github.com/#g' .git/config
git submodule update --init --recursive
cd playground/
npm i
npm run start

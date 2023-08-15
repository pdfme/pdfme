#!/bin/bash

git submodule update --init --recursive

cd playground/

npm i

npm run start

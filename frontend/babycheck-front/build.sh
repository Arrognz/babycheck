#!/bin/bash

npm run build
rm -rf static
mv build static
rm -rf ../../static
cp -r static ../../static
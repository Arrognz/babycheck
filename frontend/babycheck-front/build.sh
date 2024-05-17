#!/bin/bash

npm run build
rm -rf ../../static/*
cp -r build ../../static
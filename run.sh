#!/bin/bash

make
go install -v .
go mod vendor
heroku local --port 5001

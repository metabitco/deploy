#!/usr/bin/env bash
source /home/ubuntu/.deploy-APPLICATION_NAME-env
cd $DEPLOY_DIRECTORY/$DEPLOY_NAME

composer install 2>&1

# MAAP STAC Infrastructure

This repository contains the AWS CDK code (written in typescript) used to deploy the MAAP project STAC infrastructure. This is mostly a thin wrapper that makes use of the [cdk-pgstac](https://github.com/developmentseed/cdk-pgstac) constructs : 

- a database
- an API to add or delete things from the database
- an API to query the database

This wrapper repository only adds a VPC to add these components in and a 'bastion host' for secure direct connections to the database (see the [asdi repository](https://github.com/developmentseed/aws-asdi-pgstac))

## Deployment

### Requirements

1. `node.js` is installed
2. `docker` is installed and running
3. node dependencies are installed : run `npm install` from the root of this repo.
4. If deploying on SMCE : make sure you are properly authenticated. Refer to [these instructions](https://github.com/NASA-IMPACT/active-maap-sprint/issues/482#issuecomment-1491475121).

### Steps

1. add your information to `userdata.yaml` (see [asdi repository](https://github.com/developmentseed/aws-asdi-pgstac))
2. add your IP address to the two IP whitelists in `cdk/app.ts` (see [asdi repository](https://github.com/developmentseed/aws-asdi-pgstac)). The API gateway list determines who can add/delete things from the database, and the bastion host white list determines who can directly connect to the database.
3. declare a `STAGE` environment variable ("test" or "prod")
4. from the root of this repository, run then `cdk deploy --all` to deploy. 

## Deploy with a local version of `cdk-pgstac`

To do this, see [these instructions](https://github.com/developmentseed/cdk-pgstac/pull/34#issuecomment-1500558124).

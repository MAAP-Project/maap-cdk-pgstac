import {
    Stack,
    StackProps,
    aws_iam as iam,
    aws_ec2 as ec2,
    aws_rds as rds,
    aws_secretsmanager as secretsmanager
  } from "aws-cdk-lib";
  import { Construct } from "constructs";
  import {
    BastionHost,
    PgStacApiLambda,
    StacIngestor,
  } from "cdk-pgstac";
  import { readFileSync } from "fs";
  

  /**
   * Stack for deploying the stateless ("application") components of the MAAP pgSTAC system.
   */
  export class PgStacApplication extends Stack {
    constructor(scope: Construct, id: string, props: Props) {
      super(scope, id, props);
  
      const { vpc, stage, version, jwksUrl, dataAccessRoleArn, pgstacSecret, db } = props;
  
      const apiSubnetSelection: ec2.SubnetSelection = {
        subnetType: props.dbSubnetPublic
          ? ec2.SubnetType.PUBLIC
          : ec2.SubnetType.PRIVATE_WITH_EGRESS,
      };
  
      const stacApiLambda = new PgStacApiLambda(this, "pgstac-api", {
        apiEnv: {
          NAME: `MAAP STAC API (${stage})`,
          VERSION: version,
          DESCRIPTION: "STAC API for the MAAP STAC system.",
        },
        vpc,
        db,
        dbSecret: pgstacSecret,
        subnetSelection: apiSubnetSelection,
      });
  
  
      stacApiLambda.stacApiLambdaFunction.addPermission('ApiGatewayInvoke', {
        principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
        sourceArn: props.stacApiIntegrationApiArn,
      });
  
      new BastionHost(this, "bastion-host", {
        vpc,
        db,
        ipv4Allowlist: props.bastionIpv4AllowList,
        userData: ec2.UserData.custom(
          readFileSync(props.bastionUserDataPath, { encoding: "utf-8" })
        ),
        createElasticIp: props.bastionHostCreateElasticIp,
      });
  
      
      const dataAccessRole = iam.Role.fromRoleArn(this, "data-access-role", dataAccessRoleArn);
  
  
      const stacIngestor = new StacIngestor(this, "stac-ingestor", {
        vpc,
        stacUrl: stacApiLambda.url,
        dataAccessRole,
        stage,
        stacDbSecret: pgstacSecret,
        stacDbSecurityGroup: db.connections.securityGroups[0],
        subnetSelection: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        apiEnv: {
          JWKS_URL: jwksUrl,
          REQUESTER_PAYS: "true",
        }
      });
  
    }
  }
  
  export interface Props extends StackProps {
    vpc: ec2.Vpc;
  
    /**
     * Stage this stack. Used for naming resources.
     */
    stage: string;
  
    /**
     * Version of this stack. Used to correlate codebase versions
     * to services running.
     */
    version: string;
  
    /**
     * Flag to control whether database should be deployed into a
     * public subnet.
     */
    dbSubnetPublic?: boolean;
  
    /**
     * Where userdata.yaml is found.
     */
    bastionUserDataPath: string;
  
    /**
     * Which IPs to allow to access bastion host.
     */
    bastionIpv4AllowList: string[];
  
    /**
     * Flag to control whether the Bastion Host should make a non-dynamic elastic IP.
     */
    bastionHostCreateElasticIp?: boolean;
  
    /**
     * URL of JWKS endpoint, provided as output from ASDI-Auth.
     *
     * Example: "https://cognito-idp.{region}.amazonaws.com/{region}_{userpool_id}/.well-known/jwks.json"
     */
    jwksUrl: string;
  
    /**
     * ARN of IAM role that will be assumed by the STAC Ingestor.
     */
    dataAccessRoleArn: string;
  
    /**
     * STAC API api gateway source ARN to be granted STAC API lambda invoke permission.
     */
    stacApiIntegrationApiArn: string;

    /**
     * Secret containing the database credentials.
     */
    pgstacSecret: secretsmanager.ISecret;

    /**
     * Database to connect to.
    */
    db: rds.DatabaseInstance;
  }
          
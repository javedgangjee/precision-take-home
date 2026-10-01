from pathlib import Path

from aws_cdk import CfnOutput, RemovalPolicy, Stack
from aws_cdk import aws_certificatemanager as acm
from aws_cdk import aws_ec2 as ec2
from aws_cdk import aws_ecs as ecs
from aws_cdk import aws_ecs_patterns as ecs_patterns
from aws_cdk import aws_logs as logs
from aws_cdk import aws_route53 as route53
from aws_cdk import aws_secretsmanager as secretsmanager
from aws_cdk.aws_ecr_assets import Platform
from constructs import Construct

# Cloudflare delegates this zone to Route 53. The stack imports it by id, so synth needs no lookup.
HOSTED_ZONE_ID = "Z069085429G5UY5JHXYU4"
ZONE_NAME = "precision.jgangjee.com"
DOMAIN_NAME = f"api.{ZONE_NAME}"
BACKEND_DIR = Path(__file__).resolve().parents[2] / "backend"
CONTAINER_PORT = 8000
# The local client runs on port 4200, and a browser can open it by name or by address.
CORS_ORIGINS = "http://localhost:4200,http://127.0.0.1:4200"


class PrecisionStack(Stack):
    """The stream server on ECS Fargate behind an ALB at https://api.precision.jgangjee.com."""

    def __init__(self, scope: Construct, construct_id: str) -> None:
        super().__init__(scope, construct_id)

        zone = route53.HostedZone.from_hosted_zone_attributes(
            self, "Zone", hosted_zone_id=HOSTED_ZONE_ID, zone_name=ZONE_NAME
        )
        certificate = acm.Certificate(
            self,
            "Certificate",
            domain_name=DOMAIN_NAME,
            validation=acm.CertificateValidation.from_dns(zone),
        )

        # Public subnets only, with no NAT gateway. The task gets a public IP to pull the image.
        vpc = ec2.Vpc(
            self,
            "Vpc",
            max_azs=2,
            nat_gateways=0,
            subnet_configuration=[
                ec2.SubnetConfiguration(name="Public", subnet_type=ec2.SubnetType.PUBLIC)
            ],
        )
        cluster = ecs.Cluster(self, "Cluster", vpc=vpc)

        log_group = logs.LogGroup(
            self,
            "Logs",
            retention=logs.RetentionDays.ONE_WEEK,
            removal_policy=RemovalPolicy.DESTROY,
        )

        # The admin API needs this token in each request. The README shows how to read it.
        admin_token = secretsmanager.Secret(
            self,
            "AdminToken",
            generate_secret_string=secretsmanager.SecretStringGenerator(
                password_length=32, exclude_punctuation=True
            ),
            removal_policy=RemovalPolicy.DESTROY,
        )

        # One task, because the server makes one shared stream for every client.
        # A deploy stops the old task before it starts the new one.
        fargate = ecs_patterns.ApplicationLoadBalancedFargateService(
            self,
            "Service",
            cluster=cluster,
            cpu=256,
            memory_limit_mib=512,
            runtime_platform=ecs.RuntimePlatform(
                cpu_architecture=ecs.CpuArchitecture.ARM64,
                operating_system_family=ecs.OperatingSystemFamily.LINUX,
            ),
            desired_count=1,
            min_healthy_percent=0,
            max_healthy_percent=100,
            circuit_breaker=ecs.DeploymentCircuitBreaker(rollback=True),
            assign_public_ip=True,
            task_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PUBLIC),
            public_load_balancer=True,
            certificate=certificate,
            domain_name=DOMAIN_NAME,
            domain_zone=zone,
            redirect_http=True,
            task_image_options=ecs_patterns.ApplicationLoadBalancedTaskImageOptions(
                image=ecs.ContainerImage.from_asset(
                    str(BACKEND_DIR), platform=Platform.LINUX_ARM64
                ),
                container_port=CONTAINER_PORT,
                environment={"CORS_ORIGINS": CORS_ORIGINS},
                secrets={"ADMIN_TOKEN": ecs.Secret.from_secrets_manager(admin_token)},
                log_driver=ecs.LogDrivers.aws_logs(stream_prefix="backend", log_group=log_group),
            ),
        )

        fargate.target_group.configure_health_check(path="/health")
        # Open streams never end on their own, so a short delay keeps a deploy from waiting 5 min.
        fargate.target_group.set_attribute("deregistration_delay.timeout_seconds", "5")

        # The pattern already outputs the service URL. These names help with update-service.
        CfnOutput(self, "ClusterName", value=cluster.cluster_name)
        CfnOutput(self, "ServiceName", value=fargate.service.service_name)
        CfnOutput(self, "AdminTokenSecretArn", value=admin_token.secret_arn)

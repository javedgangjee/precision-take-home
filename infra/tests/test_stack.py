import aws_cdk as cdk
import pytest
from aws_cdk.assertions import Match, Template

from infra.precision_stack import PrecisionStack


@pytest.fixture(scope="module")
def template() -> Template:
    app = cdk.App()
    stack = PrecisionStack(app, "TestStack", env=cdk.Environment(region="us-east-2"))
    return Template.from_stack(stack)


def test_task_runs_the_server_on_arm64_with_the_cors_origins(template: Template) -> None:
    template.has_resource_properties(
        "AWS::ECS::TaskDefinition",
        {
            "Cpu": "256",
            "Memory": "512",
            "RuntimePlatform": {"CpuArchitecture": "ARM64", "OperatingSystemFamily": "LINUX"},
            "ContainerDefinitions": [
                Match.object_like(
                    {
                        "PortMappings": [Match.object_like({"ContainerPort": 8000})],
                        "Environment": Match.array_with(
                            [
                                {
                                    "Name": "CORS_ORIGINS",
                                    "Value": "http://localhost:4200,http://127.0.0.1:4200",
                                }
                            ]
                        ),
                    }
                )
            ],
        },
    )


def test_service_runs_one_task_and_stops_it_before_a_new_one(template: Template) -> None:
    template.has_resource_properties(
        "AWS::ECS::Service",
        {
            "DesiredCount": 1,
            "DeploymentConfiguration": Match.object_like(
                {
                    "MinimumHealthyPercent": 0,
                    "MaximumPercent": 100,
                    "DeploymentCircuitBreaker": {"Enable": True, "Rollback": True},
                }
            ),
        },
    )


def test_target_group_checks_health_and_drains_in_5_s(template: Template) -> None:
    template.has_resource_properties(
        "AWS::ElasticLoadBalancingV2::TargetGroup",
        {
            "HealthCheckPath": "/health",
            "TargetGroupAttributes": Match.array_with(
                [{"Key": "deregistration_delay.timeout_seconds", "Value": "5"}]
            ),
        },
    )


def test_listeners_serve_https_and_redirect_http(template: Template) -> None:
    template.has_resource_properties(
        "AWS::ElasticLoadBalancingV2::Listener",
        {"Protocol": "HTTPS", "Port": 443, "Certificates": [Match.any_value()]},
    )
    template.has_resource_properties(
        "AWS::ElasticLoadBalancingV2::Listener",
        {
            "Protocol": "HTTP",
            "Port": 80,
            "DefaultActions": [
                Match.object_like(
                    {
                        "Type": "redirect",
                        "RedirectConfig": Match.object_like({"Protocol": "HTTPS", "Port": "443"}),
                    }
                )
            ],
        },
    )


def test_certificate_and_record_use_the_domain_in_the_zone(template: Template) -> None:
    template.has_resource_properties(
        "AWS::CertificateManager::Certificate",
        {"DomainName": "api.precision.jgangjee.com", "ValidationMethod": "DNS"},
    )
    template.has_resource_properties(
        "AWS::Route53::RecordSet",
        {
            "Name": "api.precision.jgangjee.com.",
            "Type": "A",
            "HostedZoneId": "Z069085429G5UY5JHXYU4",
        },
    )


def test_has_no_nat_gateway(template: Template) -> None:
    template.resource_count_is("AWS::EC2::NatGateway", 0)

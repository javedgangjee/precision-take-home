from aws_cdk import Stack
from constructs import Construct


class PrecisionStack(Stack):
    """The stack for the stream server. Feature 5 adds the resources."""

    def __init__(self, scope: Construct, construct_id: str) -> None:
        super().__init__(scope, construct_id)

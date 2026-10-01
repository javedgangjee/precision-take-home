import aws_cdk as cdk

from infra.precision_stack import PrecisionStack

app = cdk.App()
# The stack names no account or region. A deploy uses the ones in the AWS profile at the time,
# and the VPC picks 2 zones in the template, so synth makes no AWS lookup.
PrecisionStack(app, "PrecisionStack")
app.synth()

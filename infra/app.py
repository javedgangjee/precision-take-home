import aws_cdk as cdk

from infra.precision_stack import PrecisionStack

app = cdk.App()
# The stack sets only the region. With an account too, the VPC would look up the availability
# zones in AWS and write cdk.context.json. With the region only, the template picks 2 zones.
PrecisionStack(app, "PrecisionStack", env=cdk.Environment(region="us-east-2"))
app.synth()

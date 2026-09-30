import aws_cdk as cdk

from infra.precision_stack import PrecisionStack

app = cdk.App()
PrecisionStack(app, "PrecisionStack")
app.synth()

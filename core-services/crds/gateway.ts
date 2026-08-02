import { NullProvider } from "@cdktf/provider-null/lib/provider";
import { Resource } from "@cdktf/provider-null/lib/resource";
import { Construct } from "constructs";

type GatewayApiCrdsOptions = {
  gatewayCrdsUrl: string;
};

export class GatewayApiCrds extends Construct {
  constructor(scope: Construct, id: string, options: GatewayApiCrdsOptions) {
    super(scope, id);

    const { gatewayCrdsUrl } = options;

    const applyCmd = ["kubectl", "apply", "--server-side", "-f", gatewayCrdsUrl].join(" ");
    const deleteCmd = ["kubectl", "delete", "-f", gatewayCrdsUrl].join(" ");

    new Resource(this, "install", {
      provider: new NullProvider(this, "null-provider"),
      provisioners: [
        {
          type: "local-exec",
          when: "create",
          command: applyCmd,
        },
        {
          type: "local-exec",
          when: "destroy",
          command: deleteCmd,
        },
      ],
      triggers: {
        gatewayCrdsUrl,
      },
    });
  }
}

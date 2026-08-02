import { Construct } from "constructs";
import { TerraformStack } from "cdktf";
import { KubernetesProvider } from "@cdktf/provider-kubernetes/lib/provider";
import { ApiServerProxy } from "./api-proxy";
import { NetworkRouter } from "./network-router";
import { Gateway } from "./gateway";

export class NetbirdResources extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const provider = new KubernetesProvider(this, "kubernetes", {
      configPath: "~/.kube/config",
    });

    const namespace = "netbird";

    new ApiServerProxy(this, "api-server-proxy", {
      provider,
      namespace,
    });

    new NetworkRouter(this, "network-router", {
      provider,
      namespace,
    });

    new Gateway(this, "gateway", {
      provider,
      namespace,
      name: "public",
      gatewayClassName: "netbird-public",
    });
  }
}

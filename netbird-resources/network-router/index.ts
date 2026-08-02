import { Construct } from "constructs";
import { KubernetesProvider } from "@cdktf/provider-kubernetes/lib/provider";
import { Manifest } from "@cdktf/provider-kubernetes/lib/manifest";

type NetworkRouterOptions = {
  provider: KubernetesProvider;
  namespace: string;
};

export class NetworkRouter extends Construct {
  constructor(scope: Construct, id: string, options: NetworkRouterOptions) {
    super(scope, id);

    const { provider, namespace } = options;

    new Manifest(this, "network-router", {
      provider,
      manifest: {
        apiVersion: "netbird.io/v1alpha1",
        kind: "NetworkRouter",
        metadata: {
          namespace,
          name: "netbird",
        },
        spec: {
          dnsZoneRef: {
            name: "cluster.local",
          },
        },
      },
    });
  }
}

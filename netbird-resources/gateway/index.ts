import { Construct } from "constructs";
import { KubernetesProvider } from "@cdktf/provider-kubernetes/lib/provider";
import { Manifest } from "@cdktf/provider-kubernetes/lib/manifest";

type GatewayOptions = {
  provider: KubernetesProvider;
  name: string;
  namespace: string;
  gatewayClassName: string;
};

export class Gateway extends Construct {
  constructor(scope: Construct, id: string, options: GatewayOptions) {
    super(scope, id);

    const { provider, namespace, gatewayClassName, name } = options;

    new Manifest(this, "gateway", {
      provider,
      manifest: {
        apiVersion: "gateway.networking.k8s.io/v1",
        kind: "Gateway",
        metadata: {
          namespace,
          name,
        },
        spec: {
          gatewayClassName,
          listeners: [{
            protocol: "gateway.netbird.io/NetworkRouter",
            name: "netbird",
            port: 1,
            allowedRoutes: {
              namespaces: {
                from: "All",
              },
            },
          }],
        },
      },
    });
  }
}

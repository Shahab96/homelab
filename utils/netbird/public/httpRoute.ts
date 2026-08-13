import { Construct } from "constructs";
import { Manifest } from "@cdktf/provider-kubernetes/lib/manifest";
import { KubernetesProvider } from "@cdktf/provider-kubernetes/lib/provider";

export type NetbirdPublicHttpRouteOptions = {
  provider: KubernetesProvider;
  namespace: string;
  name: string;
  hostnames: string[];
  backendRefs: [{
    name: string;
    port: number;
  }];
  labels?: Record<string, string>;
};

export class NetbirdPublicHttpRoute extends Construct {
  constructor(scope: Construct, id: string, options: NetbirdPublicHttpRouteOptions) {
    super(scope, id);

    const { provider, namespace, name, labels, hostnames, backendRefs } = options;

    new Manifest(this, "http-route", {
      provider,
      manifest: {
        apiVersion: "gateway.networking.k8s.io/v1",
        kind: "HTTPRoute",
        metadata: {
          name,
          namespace,
          labels,
        },
        spec: {
          hostnames,
          parentRefs: [{
            name: "public",
            namespace: "netbird",
            sectionName: "netbird",
          }],
          rules: [{
            backendRefs,
          }],
        },
      },
    });
  }
}

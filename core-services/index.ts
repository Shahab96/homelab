import { HelmProvider } from "@cdktf/provider-helm/lib/provider";
import { NamespaceV1 } from "@cdktf/provider-kubernetes/lib/namespace-v1";
import { KubernetesProvider } from "@cdktf/provider-kubernetes/lib/provider";
import { TerraformOutput, TerraformStack } from "cdktf";
import { Construct } from "constructs";
import { CertManager } from "./cert-manager";
import { Cilium } from "./cilium";
import { Longhorn } from "./longhorn";
import { MetalLB } from "./metallb";
import { Traefik } from "./traefik";
import { GatewayApiCrds } from "./crds/gateway";
import { OpenBao } from "./openbao";

export class CoreServices extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const kubernetes = new KubernetesProvider(this, "kubernetes", {
      configPath: "~/.kube/config",
    });

    const helm = new HelmProvider(this, "helm", {
      kubernetes: {
        configPath: "~/.kube/config",
      },
    });

    const namespace = "homelab";

    new NamespaceV1(this, "namespace", {
      provider: kubernetes,
      metadata: {
        name: namespace,
      },
    }).importFrom("homelab");

    new TerraformOutput(this, "namespace-output", {
      value: namespace,
    });

    const gatewayApiCrds = new GatewayApiCrds(this, "gateway-api-crds", {
      gatewayCrdsUrl: "https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.5.0/experimental-install.yaml",
    });

    new Cilium(this, "cilium", {
      provider: helm,
      name: "cilium",
      namespace: "kube-system",
    });

    const longhorn = new Longhorn(this, "longhorn", {
      name: "longhorn",
      providers: {
        kubernetes,
        helm,
      },
    });

    new MetalLB(this, "metallb", {
      provider: helm,
      name: "metallb",
      namespace: "metallb-system",
    });

    new Traefik(this, "traefik", {
      provider: helm,
      namespace,
      name: "traefik",
    });

    new CertManager(this, "cert-manager", {
      provider: helm,
      name: "cert-manager",
      namespace,
    });

    const openbao = new OpenBao(this, "openbao", {
      provider: helm,
      name: "openbao",
      namespace: "openbao",
    });
    openbao.node.addDependency(gatewayApiCrds);
    openbao.node.addDependency(longhorn);
  }
}

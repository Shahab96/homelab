import * as fs from "fs";
import * as path from "path";
import { HelmProvider } from "@cdktf/provider-helm/lib/provider";
import { KubernetesProvider } from "@cdktf/provider-kubernetes/lib/provider";
import { Release } from "@cdktf/provider-helm/lib/release";
import { Construct } from "constructs";
import { OpenBaoBackup } from "./backup";

type OpenBaoOptions = {
  provider: HelmProvider;
  kubernetesProvider: KubernetesProvider;
  name: string;
  namespace: string;
};

export class OpenBao extends Construct {
  constructor(scope: Construct, id: string, options: OpenBaoOptions) {
    super(scope, id);

    const { kubernetesProvider, ...releaseOptions } = options;

    const release = new Release(this, id, {
      ...releaseOptions,
      repository: "https://openbao.github.io/openbao-helm",
      chart: "openbao",
      createNamespace: true,
      values: [
        fs.readFileSync(path.join(__dirname, "values.yaml"), {
          encoding: "utf8",
        }),
      ],
    });

    // Depends on the release: it creates the "openbao" namespace and the
    // openbao-active service the snapshot init container talks to.
    const backup = new OpenBaoBackup(this, "backup", {
      provider: kubernetesProvider,
      namespace: options.namespace,
      bucket: "shahab-openbao-backup",
    });
    backup.node.addDependency(release);
  }
}

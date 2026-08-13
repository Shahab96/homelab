import { CronJobV1 } from "@cdktf/provider-kubernetes/lib/cron-job-v1";
import { KubernetesProvider } from "@cdktf/provider-kubernetes/lib/provider";
import { ServiceAccountV1 } from "@cdktf/provider-kubernetes/lib/service-account-v1";
import { Construct } from "constructs";
import { OnePasswordSecret } from "../../utils/1password-secret";

type OpenBaoBackupOptions = {
  provider: KubernetesProvider;
  namespace: string;
  bucket: string;
  schedule?: string;
};

/**
 * Daily raft snapshot of OpenBao, uploaded to a DigitalOcean Spaces bucket.
 *
 * Auth: the job's ServiceAccount logs in via OpenBao's `kubernetes` auth
 * method (role `openbao-backup`, policy allows only sys/storage/raft/snapshot).
 * That role/policy is configured at runtime (bao CLI), not via Terraform.
 *
 * Spaces credentials come from 1Password (op://Lab/digital-ocean-spaces) via
 * the 1Password Connect operator. Retention is handled by a bucket lifecycle
 * rule (30 days), not by this job.
 */
export class OpenBaoBackup extends Construct {
  constructor(scope: Construct, id: string, options: OpenBaoBackupOptions) {
    super(scope, id);

    const { provider, namespace, bucket } = options;
    const schedule = options.schedule ?? "0 3 * * *"; // 03:00 daily

    const serviceAccount = new ServiceAccountV1(this, "service-account", {
      provider,
      metadata: {
        name: "openbao-backup",
        namespace,
      },
    });

    const spacesSecret = new OnePasswordSecret(this, "spaces-secret", {
      provider,
      namespace,
      name: "openbao-backup-spaces",
      itemPath: "vaults/Lab/items/digital-ocean-spaces",
    });

    const cronJob = new CronJobV1(this, "cronjob", {
      provider,
      metadata: {
        name: "openbao-backup",
        namespace,
      },
      spec: {
        schedule,
        timezone: "Etc/UTC",
        concurrencyPolicy: "Forbid",
        successfulJobsHistoryLimit: 3,
        failedJobsHistoryLimit: 3,
        jobTemplate: {
          metadata: {
            labels: { app: "openbao-backup" },
          },
          spec: {
            backoffLimit: 2,
            template: {
              metadata: {
                labels: { app: "openbao-backup" },
              },
              spec: {
                serviceAccountName: serviceAccount.metadata.name,
                restartPolicy: "Never",
                volume: [
                  {
                    name: "backup",
                    emptyDir: {},
                  },
                ],
                initContainer: [
                  {
                    name: "snapshot",
                    image: "quay.io/openbao/openbao:2.6.1",
                    command: ["/bin/sh", "-c"],
                    args: [
                      [
                        "set -e",
                        // The bao CLI prompts for the JWT interactively when it
                        // is not passed explicitly, which fails without a TTY.
                        "JWT=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)",
                        'bao login -method=kubernetes role=openbao-backup jwt="$JWT" > /dev/null',
                        'SNAP="/backup/openbao-raft-$(date +%Y%m%d-%H%M%S).snap"',
                        'bao operator raft snapshot save "$SNAP"',
                        'echo "snapshot saved: $SNAP"',
                      ].join("\n"),
                    ],
                    env: [
                      {
                        name: "BAO_ADDR",
                        value: "http://openbao-active:8200",
                      },
                    ],
                    volumeMount: [
                      {
                        name: "backup",
                        mountPath: "/backup",
                      },
                    ],
                  },
                ],
                container: [
                  {
                    name: "upload",
                    image: "amazon/aws-cli:2.36.1",
                    command: ["/bin/sh", "-c"],
                    args: [
                      [
                        "set -e",
                        'aws --endpoint-url "$AWS_ENDPOINTS" s3 cp /backup/ ' +
                          `s3://${bucket}/ --recursive --exclude ".*"`,
                        'echo "upload to Spaces complete"',
                      ].join("\n"),
                    ],
                    envFrom: [
                      {
                        secretRef: {
                          name: "openbao-backup-spaces",
                        },
                      },
                    ],
                    volumeMount: [
                      {
                        name: "backup",
                        mountPath: "/backup",
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
      },
    });

    // The OnePasswordItem CRD must exist so the operator materializes the
    // Spaces secret before the first job runs.
    cronJob.node.addDependency(spacesSecret);
  }
}

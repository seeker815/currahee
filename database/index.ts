import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as k8s from "@pulumi/kubernetes";
import { envSuffix } from '../gke-cluster/lib';
import { Namespace } from "@pulumi/kubernetes/core/v1";
import { environment, primaryNodePool, isPatchEnabled } from "./config";
import { createClusterNeo4J } from './neo4j_cluster';
import { createPatchNeo4J } from './patch_sa';

// Create the k8s provider with the kubeconfig.
export const clusterProvider = new k8s.Provider("k8sProvider", { kubeconfig: "../gke-cluster/kubeconfig"});

const environmentSuffix = envSuffix(environment);
console.log(`environmentSuffix: ${environmentSuffix}`);

export const neo4jNS = new k8s.core.v1.Namespace(`neo4j${environmentSuffix}`, {metadata: { name: `neo4j${environmentSuffix}` }}, { provider: clusterProvider });

// create GCP service account, map to kubernetes SA and assign storage and workload identity role
const saNeo4j = new gcp.serviceaccount.Account(`sa-neo4j${environmentSuffix}`, {
    accountId: `sa-neo4j${environmentSuffix}`,
    displayName: `A service account used for storage access to neo4j`,
});

const storageRWRole = new gcp.projects.IAMCustomRole(`role-neo4j-storage-rw${environmentSuffix}`, {
  description: "Bucket  read write role for neo4j",
  permissions: [
      "storage.objects.create",
      "storage.objects.list",
      "storage.objects.get",
      "storage.objects.update",
      "storage.multipartUploads.create",
      "storage.multipartUploads.listParts",
      "storage.multipartUploads.abort",
      "resourcemanager.projects.getIamPolicy",
  ],
  roleId: `roleneo4jstoragerw${environment}`,
  title: `role-neo4j-storage-rw${environmentSuffix}`,
});

const saNeo4jStorageBinding = new gcp.serviceaccount.IAMBinding(`saNeo4j-storage-iam${environmentSuffix}`, {
  serviceAccountId: saNeo4j.name,
  role: storageRWRole.name,
  members: [pulumi.concat("serviceAccount", ":", saNeo4j.email)],
});

// create K8s SA  and map to GCP service account, to be used in neo4j.
const saK8sNeo4j = new k8s.core.v1.ServiceAccount(`sa-k8sneo4j${environmentSuffix}`, {
    metadata: {
      name: `sa-k8sneo4j${environmentSuffix}`,
      namespace: neo4jNS.metadata.name,
      annotations: {
        "iam.gke.io/gcp-service-account": saNeo4j.email,
      }
    },
  },{ provider: clusterProvider });
export const neo4jSA = saK8sNeo4j.metadata.name;

const clusterPoolIdentity = pulumi.concat(`${gcp.config.project}`,".", "svc.id.goog" );
const saK8sNeo4jIam = new gcp.serviceaccount.IAMBinding(`saK8sNeo4j-account-iam${environmentSuffix}`, {
  serviceAccountId: saNeo4j.name,
  role: "roles/iam.workloadIdentityUser",
  members: [pulumi.concat("serviceAccount", ":", clusterPoolIdentity, "[", neo4jNS.metadata.name, "/", saK8sNeo4j.metadata.name, "]" )],
});

const neo4jDB  = createClusterNeo4J(neo4jNS.metadata.name, 3, 0, environment, primaryNodePool);

const patchClusterProvider = new k8s.Provider("patchk8sProvider", { kubeconfig: "../k8s/kubeconfig", enableServerSideApply: true}, );

// patch RBAC to suppor custom service account with pub/sub publish 
const serverNames = [
    'core-1',
    'core-2',
    'core-3'
];

// can be improved by using helm post-render 
if (isPatchEnabled == "true") {
  createPatchNeo4J(neo4jNS.metadata.name, serverNames, saK8sNeo4j.metadata.name, patchClusterProvider, environmentSuffix);
}
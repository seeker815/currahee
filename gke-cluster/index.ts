import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as k8s from "@pulumi/kubernetes";
import { envSuffix } from './lib';
import { environment, environmentSuffix, gkeClusterName, clusterExtNetwork1, clusterLocation, primaryNodeCount, primaryNodeDiskSize,  clusterNetwork, clusterNodeCount, clusterMasterCIDR, clusterPodIPCIDR, clusterSvcIPCIDR, nodeMachineType, secondaryNodeCount, secondaryNodeMachineType, secondaryNodeDiskSize  } from './config';

// Fetch the default service account to provision cluster
const saClusterCreator = pulumi.output(gcp.serviceaccount.getAccount({
    accountId: "object-viewer",
}));

const clusterPoolIdentity = pulumi.concat(`${gcp.config.project}`,".", "svc.id.goog" )
const primary = new gcp.container.Cluster(gkeClusterName, {
    addonsConfig: {
      gcePersistentDiskCsiDriverConfig:{
          enabled: true,
      },
      dnsCacheConfig: {
          enabled: true,
      },
    },
    // placeholder for turning on autoscaling for node pools
    clusterAutoscaling: {

    },
    masterAuthorizedNetworksConfig: {
        cidrBlocks: [{
            cidrBlock: clusterExtNetwork1,
            }
        ],
    },
    location: clusterLocation,
    removeDefaultNodePool: true,
    network: clusterNetwork,
    networkingMode: "VPC_NATIVE",
    initialNodeCount: clusterNodeCount,
    privateClusterConfig: {
        enablePrivateEndpoint: false,
        enablePrivateNodes: true,
        masterGlobalAccessConfig: {
              enabled: true,
        },
        masterIpv4CidrBlock: clusterMasterCIDR,
    },
    ipAllocationPolicy: {
      clusterIpv4CidrBlock: clusterPodIPCIDR,
      servicesIpv4CidrBlock: clusterSvcIPCIDR,
    },
    workloadIdentityConfig: {
        workloadPool:  clusterPoolIdentity,
    }, 

});

// Create node pool with taints
const primaryNodePool = new gcp.container.NodePool("primary-nodes", {
    location: clusterLocation,
    cluster: primary.name,
    nodeCount: primaryNodeCount,
    
    nodeConfig: {
        machineType: nodeMachineType,
        serviceAccount: saClusterCreator.email,
        oauthScopes: [
          "https://www.googleapis.com/auth/cloud-platform",
          "https://www.googleapis.com/auth/devstorage.read_write",
          "https://www.googleapis.com/auth/compute",
          "https://www.googleapis.com/auth/logging.write",
          "https://www.googleapis.com/auth/monitoring",
          "https://www.googleapis.com/auth/service.management.readonly",
          "https://www.googleapis.com/auth/servicecontrol",
          "https://www.googleapis.com/auth/trace.append"
          ],
        diskSizeGb: primaryNodeDiskSize,
        taints: [{
            key: "dedicated",
            value: "db",
            effect: "PREFER_NO_SCHEDULE",
        }],
    },
    
});

const secondaryNodePool = new gcp.container.NodePool("secondary-nodes", {
    location: clusterLocation,
    cluster: primary.name,
    nodeCount: secondaryNodeCount,
    nodeConfig: {
       machineType: secondaryNodeMachineType,
       serviceAccount: saClusterCreator.email,
       oauthScopes: [
           "https://www.googleapis.com/auth/cloud-platform",
           "https://www.googleapis.com/auth/devstorage.read_write",
           "https://www.googleapis.com/auth/compute",
           "https://www.googleapis.com/auth/logging.write",
           "https://www.googleapis.com/auth/monitoring",
           "https://www.googleapis.com/auth/service.management.readonly",
           "https://www.googleapis.com/auth/servicecontrol",
           "https://www.googleapis.com/auth/trace.append",
         ],
       diskSizeGb: secondaryNodeDiskSize,
   }, 
});

// Export the Cluster name
export const clusterName = primary.name;
export const clusterPrimaryNodePool = primaryNodePool.name;
export const clusterSecondaryNodePool = secondaryNodePool.name;

export const kubeconfig = pulumi.
    all([ primary.name, primary.endpoint, primary.masterAuth ]).
    apply(([ name, endpoint, masterAuth ]) => {
        const context = `${gcp.config.project}_${gcp.config.zone}_${name}`;
        return `apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: ${masterAuth.clusterCaCertificate}
    server: https://${endpoint}
  name: ${context}
contexts:
- context:
    cluster: ${context}
    user: ${context}
  name: ${context}
current-context: ${context}
kind: Config
preferences: {}
users:
- name: ${context}
  user:
    auth-provider:
      config:
        cmd-args: config config-helper --format=json
        cmd-path: gcloud
        expiry-key: '{.credential.token_expiry}'
        token-key: '{.credential.access_token}'
      name: gcp
`;
    });

// Create a Kubernetes provider instance that uses our cluster from above.
export const clusterProvider = new k8s.Provider(gkeClusterName, {
    kubeconfig: kubeconfig, enableServerSideApply: true,
}, );
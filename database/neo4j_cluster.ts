import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import { neo4jHelmRepository, neo4jStorage, neo4jCoreMemRequests, neo4jCoreMemLimits, neo4jCoreCpuLimits, neo4jCoreMemHeapInitialSize, neo4jCoreMemHeapMaxSize, neo4jCorePageCacheSize, neo4jCoreHelmChartVersion, neo4jHeadlessHelmChartVersion, neo4jReplicaHelmChartVersion, environment } from "./config";
import { clusterProvider } from './index';
import { neo4jSA, neo4jNS } from './index';
import { envSuffix } from "../gke-cluster/lib";

console.log(`gcpProject: ${gcp.config.project}`);

const environmentSuffix = envSuffix(environment);
console.log(`environmentSuffix: ${environmentSuffix}`);

const values = (env: string) => ({
  neo4j: {
    name: `neo4j-cluster-${env}`,
    minimumClusterSize: 3,
    edition: "enterprise",
    acceptLicenseAgreement: "yes",
    resources: {
      requests: {
        memory: neo4jCoreMemRequests,
      },
      limits: {
        cpu: neo4jCoreCpuLimits,
        memory: neo4jCoreMemLimits
      },
    },
  },
  volumes: {
      data: {
        mode: "dynamic",
        dynamic: {
          /* In GKE;
              premium-rwo provisions SSD disks (recommended)
              standard-rwo provisions balanced SSD-backed disks
              standard provisions HDD disks 
          */
          // size defaults to 100GB
          storageClassName: neo4jStorage,
        },
      },
      plugins: {
        mode: "share",
        share: {
          name: "data"
        }
      }
  },
  services: {
    neo4j: {
      annotations: {
        "cloud.google.com/load-balancer-type": "Internal"
      },
    },
  },
  config: {
    "server.config.strict_validation.enabled": "true",
    "dbms.directories.plugins": "/plugins",
    "dbms.security.procedures.unrestricted": "apoc.*",
    "dbms.directories.logs": "/logs",
    "dbms.directories.licenses": "/licenses",
    "dbms.directories.import": "/import",
    "dbms.default_listen_address": "0.0.0.0",
  },
  apoc_config: {
    "apoc.trigger.enabled": "true",
    "apoc.trigger.refresh": "60000",
  },
  env: {
        ENV: environment,
        GCP_PROJECT: `${gcp.config.project}`
  },
  podSpec: {
    "tolerations": [{
          effect: "PreferNoSchedule",
          key: "dedicated",
          operator: "Equal",
          value: "neo4j",
    }],
  "serviceAccountName": neo4jSA,
  },    
});

// Provision Neo4j cores/replicas based on env/config.
export const createClusterNeo4J =  async (neo4jNS: pulumi.Input<string>, clusterCount: number, replicasCount: number, env: string, nodePool: pulumi.Input<string> ) => {
    // install cluster cores
    let neo4jCores:k8s.helm.v3.Release[]= [];
    const defaultValues = values(env);

    for (let count = 1; count <= clusterCount; count++) {
      neo4jCores.push( new k8s.helm.v3.Release(`core-${count}`, {
        chart: "neo4j",
        repositoryOpts: {
          repo: neo4jHelmRepository,
        },
        version: neo4jCoreHelmChartVersion,
        namespace: neo4jNS,
        name: `core-${count}`,
        values: defaultValues,
        skipAwait: true,
        
      },{provider: clusterProvider }),

      /* we introduce a wait so the cores get created and don't
      complain on resource dependency between cores */
      await new Promise(r => setTimeout(r, 60000)),
    )};
  

    // install headless service (no ClusterIP)
    const neo4jHeadless = new k8s.helm.v3.Release(`headless`, {
        chart: "neo4j-headless-service",
        repositoryOpts: {
            repo: neo4jHelmRepository,
        },
        version: neo4jHeadlessHelmChartVersion,
        name: "headless",
        namespace: neo4jNS,
        values: {
          neo4j: {
            name: `neo4j-cluster-${env}`,
          },
        },
        skipAwait: true,
    },{provider: clusterProvider, dependsOn: neo4jCores}); 
}
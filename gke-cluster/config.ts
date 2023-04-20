import * as gcp from "@pulumi/gcp";
import { Config } from "@pulumi/pulumi";
import * as pulumi from "@pulumi/pulumi";
import { envSuffix } from './lib';

let config = new pulumi.Config();
export const environment = config.require("environment") as string;
export const environmentSuffix = envSuffix(environment);

let gcpConfig = new pulumi.Config("gcp");
let gcpZone = gcpConfig.require("zone");
let gcpProject = gcpConfig.require("project");

let gkeConfig = new pulumi.Config("gke");
const clusterName = gkeConfig.get("clusterName") as string;
export const gkeClusterName = clusterName.concat(environmentSuffix);
console.log(`gkeClusterName: ${gkeClusterName}`);

// nodeCount is the number of cluster nodes to provision. Defaults to 3 if unspecified.
export const clusterNodeCount = gkeConfig.getNumber("clusterNodeCount") || 1;
export const primaryNodeCount = gkeConfig.getNumber("primaryNodeCount");
export const secondaryNodeCount = gkeConfig.getNumber("secondaryNodeCount");

export const primaryNodeDiskSize = gkeConfig.getNumber("primaryNodeDiskSize");
export const secondaryNodeDiskSize = gkeConfig.getNumber("secondaryNodeDiskSize");
// nodeMachineType is the machine type to use for cluster nodes. Defaults to n1-standard-1 if unspecified.
// See https://cloud.google.com/compute/docs/machine-types for more details on available machine types.
export const nodeMachineType = gkeConfig.get("nodeMachineType") || "e2-standard-2";

export const secondaryNodeMachineType = gkeConfig.get("secondaryNodeMachineType") || "e2-standard-2";

export const clusterLocation = gkeConfig.get("clusterLocation");

// build the variable by appending project to svc.id.goog
export const clusterPoolIdentity = gkeConfig.get("clusterPoolIdentity");

export const clusterNetwork = gkeConfig.get("clusterNetwork");

export const clusterMasterCIDR = gkeConfig.get("clusterMasterCIDR");

export const clusterPodIPCIDR = gkeConfig.get("clusterPodIPCIDR");

export const clusterSvcIPCIDR = gkeConfig.get("clusterSvcIPCIDR");

export const clusterExtNetwork1 = gkeConfig.get("clusterExtNetwork1") as string;

export const clusterExtNetwork2 = gkeConfig.get("clusterExtNetwork2") as string;

export const clusterExtNetwork3 = gkeConfig.get("clusterExtNetwork3") as string;
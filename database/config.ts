import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { Config } from "@pulumi/pulumi";

let config = new Config();
export const environment = config.get("environment") as string;
export const primaryNodePool = config.get("primaryNodePool") as string;

let neo4jConfig = new Config("neo4j");
export const neo4jCoreHelmChartVersion = neo4jConfig.get("neo4jCoreHelmChartVersion") as string;
export const neo4jHeadlessHelmChartVersion = neo4jConfig.get("neo4jHeadlessHelmChartVersion") as string;
export const neo4jReplicaHelmChartVersion = neo4jConfig.get("neo4jReplicaHelmChartVersion") as string;
export const neo4jHelmRepository = neo4jConfig.get("neo4jHelmRepository");
export const neo4jChartVersion = neo4jConfig.get("neo4jChartVersion");
export const neo4jReleaseName = neo4jConfig.get("neo4jReleaseName") as string;

export const neo4jStorage = neo4jConfig.get("neo4jStorage");
export const neo4jCoreMemRequests = neo4jConfig.get("neo4jCoreMemRequests");
export const neo4jCoreMemLimits = neo4jConfig.get("neo4jCoreMemLimits");
export const neo4jCoreCpuLimits = config.get("neo4jCoreCpuLimits");
export const neo4jCoreMemHeapInitialSize = config.get("neo4jCoreMemHeapInitialSize");
export const neo4jCoreMemHeapMaxSize = config.get("neo4jCoreMemHeapMaxSize");
export const neo4jCorePageCacheSize = config.get("neo4jCorePageCacheSize");

export const isPatchEnabled = config.get("isPatchEnabled");
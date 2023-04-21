import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

export const createPatchNeo4J =  (neo4jNS: pulumi.Input<string>, neo4jServers: string[], k8sSA: pulumi.Output<string>, patchK8sProvider: k8s.Provider, environmentSuffix: string ) => {
  const coreRBAC = neo4jServers.map(name => {
    const coreUpdate = new k8s.rbac.v1.RoleBindingPatch(`${name}-service-binding-patch-${environmentSuffix}`, {
        metadata: {
        annotations: {
            "pulumi.com/patchForce": "true",
        },
        name: `${name}-service-binding`,
        namespace: neo4jNS,
        },
        subjects: [
        {
            apiGroup: "",
            kind: "ServiceAccount",
            name: `${name}`,
        },
        {
            apiGroup: "",
            kind: "ServiceAccount",
            name: k8sSA,
        },
       ],
    }, { provider: patchK8sProvider})
    });
};
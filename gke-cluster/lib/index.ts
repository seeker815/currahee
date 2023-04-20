
// Functions,types commonly used by stacks in mono-repo are declared here
export const envSuffix = (environment: string) => {
    const environmentSuffix = environment === 'prod' ? '' : `-${environment}`;
    console.log(`environmentSuffix: ${environmentSuffix}`);
    return environmentSuffix;
}

export const dnsPrefix = (environment: string) => {
    const dnsPrefix = environment === 'prod' ? '' : `${environment}-`;
    console.log(`dnsPrefix: ${dnsPrefix}`);
    return dnsPrefix;
}
import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

export const getProxyConfigs = () => {
    try {
        const dockerComposePath = path.resolve(process.cwd(), '../docker/docker-compose.yml');
        const dockerComposeFile = fs.readFileSync(dockerComposePath, 'utf8');
        const dockerCompose = yaml.load(dockerComposeFile);

        const proxies = [];
        for (const serviceName in dockerCompose.services) {
            const service = dockerCompose.services[serviceName];
            if (service.build && service.ports) {
                const portMapping = service.ports.find(p => p.endsWith(':1080'));
                if (portMapping) {
                    const parts = portMapping.split(':');
                    let hostPort;
                    if (parts.length === 3) { // IP:HOST_PORT:CONTAINER_PORT
                        hostPort = parts[1];
                    } else if (parts.length === 2) { // HOST_PORT:CONTAINER_PORT
                        hostPort = parts[0];
                    } else {
                        continue; // Skip unexpected format
                    }
                    
                    let description = service.hostname || serviceName;
                    if (service.labels) {
                        const descLabel = service.labels.find(l => l.startsWith('proxy.description='));
                        if (descLabel) {
                            description = descLabel.split('=')[1];
                        }
                    }

                    proxies.push({
                        port: parseInt(hostPort, 10),
                        containerName: service.container_name || serviceName,
                        description: description,
                    });
                }
            }
        }
        return proxies;
    } catch (error) {
        console.error('Error reading or parsing docker-compose.yml:', error);
        return [];
    }
};



import util from 'util';
import { exec } from 'child_process';
import { SocksProxyAgent } from 'socks-proxy-agent';
import fetch from 'node-fetch';
import chalk from 'chalk';
import { getProxyConfigs } from './config.js';

const execAsync = util.promisify(exec);

// Timeout for fetch requests (milliseconds)
const FETCH_TIMEOUT = 30000;

// Function to get IP address
const getIp = async (agent) => {
    try {
        const startTime = Date.now();
        // If an agent is passed, it's a proxy check. Otherwise, it's a host IP check.
        const curlCommand = agent 
            ? `curl --socks5 ${agent.proxy.host}:${agent.proxy.port} https://api4.ipify.org`
            : 'curl https://api4.ipify.org';

        const { stdout } = await execAsync(curlCommand, { timeout: FETCH_TIMEOUT });
        const latency = Date.now() - startTime;
        const ip = stdout.trim();
        
        if (!ip) {
            throw new Error('Failed to get IP from curl command');
        }
        
        return { ip, latency };
    } catch (error) {
        console.error(chalk.red(`Error getting IP: ${error.message}`));
        return { ip: null, latency: null };
    }
};

// Function to check if container is running
const isContainerRunning = async (containerName) => {
    try {
        const { stdout } = await execAsync(`docker ps --format "{{.Names}}"`);
        return stdout.trim().split('\n').includes(containerName);
    } catch (error) {
        console.error(chalk.red(`Error checking container status for ${containerName}: ${error.message}`));
        return false;
    }
};

// Function to check individual proxy
const checkProxy = async (proxy) => {
    const { port, containerName, description } = proxy;
    console.info(chalk.blue(`Checking proxy: ${description} (port ${port}, container: ${containerName})`));

    if (!await isContainerRunning(containerName)) {
        console.warn(chalk.yellow(`WARNING: Container ${containerName} is not running`));
        return { ...proxy, status: 'down' };
    }

    const { ip: hostIp } = await getIp();
    if (!hostIp) {
        console.error(chalk.red("ERROR: Failed to get host IP"));
        return { ...proxy, status: 'error' };
    }

    const proxyAgent = new SocksProxyAgent(`socks5h://127.0.0.1:${port}`);
    const { ip: proxyIp, latency } = await getIp(proxyAgent);

    if (!proxyIp) {
        console.warn(chalk.yellow(`WARNING: Failed to get proxy IP for port ${port} (container: ${containerName})`));
        return { ...proxy, status: 'down' };
    }

    if (hostIp === proxyIp) {
        console.error(chalk.red(`ALERT: Proxy ${description} is NOT working correctly!`));
        return { ...proxy, status: 'error' };
    } else {
        console.info(chalk.green(`OK: Proxy ${description} is working correctly`));
        return { ...proxy, status: 'ok', ip: proxyIp, latency };
    }
};

export const runHealthCheck = async () => {
    const proxies = getProxyConfigs();
    if (proxies.length === 0) {
        console.error(chalk.red("CRITICAL: No proxy configurations found in docker-compose.yml"));
        return {
            summary: 'No proxy configurations found',
            proxies: []
        };
    }

    console.info(chalk.blue("=== Starting SOCKS5 proxy health check ==="));

    const { ip: hostIp } = await getIp();
    if (!hostIp) {
        console.error(chalk.red("CRITICAL: Cannot determine host IP - aborting health check"));
        return {
            summary: 'Could not determine host IP',
            proxies: []
        };
    }
    console.info(chalk.blue(`Host IP: ${hostIp}`));

    const results = await Promise.all(proxies.map(checkProxy));

    const workingProxies = results.filter(r => r.status === 'ok');
    const failedProxies = results.filter(r => r.status !== 'ok');

    console.info(chalk.blue(`=== Health check complete: ${workingProxies.length}/${proxies.length} proxies working ===`));

    if (failedProxies.length > 0) {
        console.warn(chalk.yellow(`WARNING: ${failedProxies.length} proxy(ies) failed health check`));
    } else {
        console.info(chalk.green("SUCCESS: All proxies passed health check"));
    }

    return {
        summary: `${workingProxies.length}/${proxies.length} proxies working`,
        working: workingProxies,
        failed: failedProxies
    };
};



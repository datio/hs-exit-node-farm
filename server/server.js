import Fastify from 'fastify';
import cors from '@fastify/cors';
import { runHealthCheck } from './lib/health-check.js';

const fastify = Fastify({
    logger: true,
});

await fastify.register(cors, {
    origin: "*", // Allow all origins
});

let healthStatus = {};
let healthCheckTimeout;
let ongoingCheckPromise = null;

const performHealthCheck = () => {
    if (ongoingCheckPromise) {
        fastify.log.info('Health check already in progress. Waiting for completion.');
        return ongoingCheckPromise;
    }

    fastify.log.info('Starting new health check.');
    ongoingCheckPromise = (async () => {
        try {
            healthStatus = await runHealthCheck();
            return healthStatus;
        } catch (error) {
            fastify.log.error(error, 'Health check failed');
            throw error; // Re-throw to allow callers to handle it
        } finally {
            ongoingCheckPromise = null;
            fastify.log.info('Health check finished.');
        }
    })();

    return ongoingCheckPromise;
};

const healthCheckLoop = async () => {
    try {
        if (ongoingCheckPromise) {
            fastify.log.info('Skipping scheduled health check as one is already in progress.');
        } else {
            await performHealthCheck();
        }
    } catch (error) {
        // Error is already logged in performHealthCheck
    } finally {
        // Schedule the next check
        healthCheckTimeout = setTimeout(healthCheckLoop, 60000);
    }
};

// Endpoint to get the current health status
fastify.get('/status', async (request, reply) => {
    return healthStatus;
});

// Endpoint to force a health check
fastify.post('/check', async (request, reply) => {
    clearTimeout(healthCheckTimeout);

    try {
        const currentStatus = await performHealthCheck();
        return currentStatus;
    } catch (error) {
        return reply.code(500).send({ error: 'An error occurred during the health check.' });
    } finally {
        // Restart the timer
        healthCheckTimeout = setTimeout(healthCheckLoop, 60000);
    }
});

const start = async () => {
    try {
        // Run the first health check on startup
        await healthCheckLoop();
        await fastify.listen({ port: 3006, host: '0.0.0.0' });
        fastify.log.info(`Server listening on ${fastify.server.address().port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();

# Headscale Exit Node Proxy Farm

This project provides a Docker Compose template that allows you to easily deploy multiple SOCKS5 proxies, each leveraging a different Tailscale exit node across multiple Tailnets for secure and flexible network access. It includes a Node.js server for health status checks.

## Features
- Dockerized deployment for portability, configurable via environment variables (`./docker/.env`) and the `docker-compose.yml` file.
- Separate Node.js based server for basic health checks.

## Project Structure
- `docker/`: Contains Docker-related files for building and running the application.
    - `.env`: Environment variables for Docker (ignored by git).
    - `docker-compose.yml`: Docker Compose configuration for multi-service setup.
    - `Dockerfile`: Dockerfile for building the tailnet socks5 image.
    - `entrypoint.sh`: Script executed when the Docker container starts.
- `server/`: The main Node.js server application.
    - `package.json`: Node.js project metadata and dependencies.
    - `server.js`: The main server entry point.
    - `lib/`: Contains server-side utility modules.
        - `config.js`: Configuration loading.
        - `health-check.js`: Health check logic.

## Setup and Installation

### Running Docker Compose SOCKS5 Proxies
1. Create a `.env` file in the `docker` directory. You can copy `docker/.env.example` or create one manually.
   ```bash
   cp docker/.env.example docker/.env
   # Edit docker/.env with your specific configurations
   ```
2. From the project root directory, build and run the Docker containers:
   ```bash
   docker-compose -f docker/docker-compose.yml up --build
   ```

### Running the Node.js Server
1. Navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `server` directory based on `docker/.env.example`.
4. Start the server:
   ```bash
   node server.js
   ```


## Usage

This project deploys multiple SOCKS5 proxies, each accessible on `127.0.0.1` at different ports. The ports are mapped as follows (refer to `docker/docker-compose.yml` for the exact mappings):

*   `127.0.0.1:1081`: Tailnet 1, Exit Node 1
*   `127.0.0.1:1082`: Tailnet 1, Exit Node 2
*   `127.0.0.1:1083`: Tailnet 2, Exit Node 1
*   `127.0.0.1:1084`: Tailnet 2, Exit Node 2
*   `127.0.0.1:1085`: Tailnet 2, Exit Node 3

You can configure your applications (e.g., web browsers, command-line tools) to use these SOCKS5 proxies. For example, to use `curl` with the first proxy:

```bash
curl --socks5-hostname 127.0.0.1:1081 http://example.com
```

## Endpoints

The Node.js server provides the following endpoints for managing and checking the health of the proxies:

-   `GET /status`: Retrieve the current health status of all configured proxies. This endpoint provides a consolidated view of whether each proxy is operational.
-   `POST /check`: Manually trigger a health check of the proxies. This is useful for forcing an immediate update of the proxy statuses without waiting for the next scheduled health check.
    ```bash
    curl -X POST http://localhost:3006/check
    ```

## Configuration

The application is primarily configured using environment variables defined in the `docker/.env` file. A template `docker/.env.example` is provided.

Key environment variables include:

*   `HEADSCALE_URL_TAILNETX`: The URL of your Headscale instance for a specific Tailnet (e.g., `HEADSCALE_URL_TAILNET1`).
*   `TS_AUTHKEY_TAILNETX`: The authentication key for a specific Tailnet (e.g., `TS_AUTHKEY_TAILNET1`).
*   `TAILNETX_EXITNODEY`: The IP address of a specific exit node within a Tailnet (e.g., `TAILNET1_EXITNODE1`).
*   `DEFAULT_SOCKS5_PORT`: The internal port on which the SOCKS5 proxy listens within the Docker container (default: `1080`).
*   `DEFAULT_TAGS`: Tailscale tags to apply to the proxy nodes (e.g., `tag:proxy`).
*   `DEFAULT_ACCEPT_ROUTES`: Whether to accept routes advertised by the Tailscale network (default: `true`).
*   `DEFAULT_ACCEPT_DNS`: Whether to accept DNS settings from the Tailscale network (default: `false`).
*   `DEFAULT_EXIT_NODE_ALLOW_LAN`: Whether to allow LAN access when using the exit node (default: `false`).

Refer to `docker/.env.example` for a complete list and examples. You can also inspect `server/lib/config.js` for how these variables are loaded and used by the Node.js server.

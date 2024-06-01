# Paymaster Proxy Cloudflare Worker

## Overview

This repository contains the code for a Cloudflare Worker that can protect your Paymaster by ensuring that it can only make calls to an allowed list of smart contracts for your app or protocol on the Base and Base Sepolia networks. The Paymaster Proxy is responsible for handling requests related to gasless transactions, ensuring that the costs of transaction fees are covered by the Paymaster, and that attempts to pay for calls to unauthorized smart contracts are blocked.

## Features

- **Gasless Transactions**: The proxy enables gasless transactions by interacting with the Paymaster service.
- **Bundler Support**: Transactions can be bundled together to improve the user experience for users of your application, allowing common transactions like `approve` and `mint` to be bundled together.
- **Contract Allowlist**: Implements security measures to ensure that calls to a set of smart contracts that you define are forwarded to your Paymaster, and calls that interact with other smart contracts are not.
- **Security**: Allows you to safely put your Cloudflare Worker URL in your frontend code without exposing your Paymaster service URL.

### Roadmap

- **Durable Objects Storage**: I plan on adding support for Durable Objects, so you can implement more advanced policies that enable sponsoring a maximum number of transactions per wallet, per time period. This will allow you to implement more advanced policies that can help prevent abuse of your Paymaster service.

## Getting Started

### Prerequisites

- A Cloudflare account
- Node.js and npm installed on your local machine
- Access to a Paymaster service API. We recommend trying Coinbase Developer Platform, which is offering free sponsorship of transactions through the Base Gasless Campaign. See below.

### Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/moonwell-fi/paymaster-proxy.git
    cd paymaster-proxy
    ```

2. Install the dependencies:

    ```bash
    npm install
    ```

### Deployment

1. Install `wrangler`:

    ```bash
    npm i wrangler
    ```

2. Deploy the Worker to Cloudflare:

    ```bash
    wrangler deploy
    ```

    This will prompt you to log in to your Cloudflare account.

## Configuration

The worker can be configured using environment variables. The following variables are required, and should be added as secret environment variables in your Cloudflare worker settings through the web console:

- `PAYMASTER_SERVICE_URL`: The URL of the Paymaster service for Base mainnet (chain ID 8453).
- `TESTNET_PAYMASTER_SERVICE_URL`: The URL of the Paymaster service for Base Sepolia (chain ID 84532).

### Additional Configuration

- You must configure your allowed list of contract addresses in the following file: [config.ts](https://github.com/moonwell-fi/paymaster-proxy/blob/main/src/config.ts).
- You must put the Cloudflare Worker URL in your frontend code. This is the URL that your application will send requests to.

## Usage

Once deployed, the Cloudflare Worker will handle incoming requests and forward them to the Paymaster service. Ensure your application is configured to send requests to the Worker endpoint.

## Base Gasless Campaign

The Coinbase Developer Platform is offering free gas credits as part of the Base Gasless Campaign. For more information, visit the [Base Gasless Campaign](https://www.smartwallet.dev/base-gasless-campaign).

## Development

### Running Locally

To run the worker locally for development purposes, use the following command:

    ```bash
    npm run dev
    ```

This will start a local development server that mimics the Cloudflare environment.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any changes.

## License

This project is licensed under the BSD 3-Clause License. See the [LICENSE](LICENSE) file for details.
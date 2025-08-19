# HubSpot Deals Analytics Pipeline

A comprehensive sales analytics platform built with [Moose](https://www.moosejs.com/) for ingesting, processing, and analyzing HubSpot deals data in real-time.

<a href="https://www.getmoose.dev/"><img src="https://raw.githubusercontent.com/514-labs/moose/main/logo-m-light.png" alt="moose logo" height="100px"></a>

[![NPM Version](https://img.shields.io/npm/v/%40514labs%2Fmoose-cli?logo=npm)](https://www.npmjs.com/package/@514labs/moose-cli?activeTab=readme)
[![Moose Community](https://img.shields.io/badge/slack-moose_community-purple.svg?logo=slack)](https://join.slack.com/t/moose-community/shared_invite/zt-2fjh5n3wz-cnOmM9Xe9DYAgQrNu8xKxg)
[![Docs](https://img.shields.io/badge/quick_start-docs-blue.svg)](https://docs.moosejs.com/)
[![MIT license](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

## Overview

This project provides a production-ready data pipeline for HubSpot sales teams to gain deep insights into their deal performance, pipeline health, and revenue forecasting. Built on [Moose](https://www.getmoose.dev/), it offers real-time data processing, comprehensive analytics APIs, and enterprise-grade reliability.

### Key Features

- 🔄 **Real-time Data Ingestion** - Stream HubSpot deals data via REST API
- 🏗️ **Robust Data Processing** - Transform raw HubSpot data into analytics-ready format
- 📊 **Rich Analytics APIs** - Pre-built endpoints for deal analytics, pipeline performance, and deal lookup
- 🚨 **Error Handling** - Dead letter queues for monitoring and debugging failed transformations
- ⚡ **High Performance** - Redis caching and ClickHouse analytics database
- 🔍 **Flexible Querying** - Group by stage, pipeline, time period, or custom filters

## Architecture

```
HubSpot API → Raw Ingestion → Stream Processing → Analytics Storage → REST APIs
```

### Data Flow
1. **Raw Data Ingestion**: HubSpot deal data ingested via `POST /ingest/HubSpotDealRaw`
2. **Stream Processing**: Real-time transformation from raw to normalized format
3. **Analytics Storage**: Processed data stored in ClickHouse for fast querying
4. **Consumption APIs**: RESTful endpoints for analytics, reporting, and deal lookup

## Quick Start

### Prerequisites
- Node.js 18+ 
- Docker (for local Moose infrastructure)
- HubSpot Private App token (for integration)

### Setup
```bash
# Clone and setup
git clone <repository-url>
cd hubspot-pipeline
npm install

# Start Moose development environment
npm run dev
```

The application will start with:
- **Ingestion API**: `http://localhost:4000/ingest/HubSpotDealRaw`
- **Analytics APIs**: `http://localhost:4000/consumption/*`
- **Health Check**: `http://localhost:4000/health`

## API Endpoints

### Ingestion
- `POST /ingest/HubSpotDealRaw` - Ingest raw HubSpot deal data

### Analytics & Reporting
- `GET /consumption/hubspot-deals-analytics` - Deal analytics grouped by stage, pipeline, or time
- `GET /consumption/hubspot-deal-lookup` - Search and lookup specific deals  
- `GET /consumption/hubspot-deal-pipeline` - Pipeline performance metrics

### Example API Calls

**Deal Analytics by Stage:**
```bash
curl "http://localhost:4000/consumption/hubspot-deals-analytics?groupBy=stage&limit=10"
```

**Search Deals:**
```bash
curl "http://localhost:4000/consumption/hubspot-deal-lookup?dealName=Enterprise&limit=5"
```

**Pipeline Performance:**
```bash
curl "http://localhost:4000/consumption/hubspot-deal-pipeline?daysBack=30&limit=5"
```

## Data Schema

### Raw Deal Data (`HubSpotDealRaw`)
```typescript
{
  id: string;                    // HubSpot deal ID
  properties: {                  // Flexible HubSpot properties
    dealname?: string;
    amount?: string;
    dealstage?: string;
    pipeline?: string;
    // ... all other HubSpot properties
  };
  createdAt: string;            // ISO timestamp
  updatedAt: string;            // ISO timestamp
  archived: boolean;
  associations: {               // Related records
    contacts: string[];
    companies: string[];
  };
}
```

### Processed Deal Data (`HubSpotDeal`)
```typescript
{
  id: string;
  dealName: string;
  amount: number;               // Parsed numeric value
  currency: string;
  stage: string;
  stageLabel: string;
  pipeline: string;
  pipelineLabel: string;
  closeDate?: Date;
  createdAt: Date;
  lastModifiedAt: Date;
  ownerId?: string;
  stageProbability: number;     // 0-1 value
  forecastAmount: number;
  projectedAmount: number;
  daysToClose?: number;         // Calculated field
  isWon: boolean;              // Derived from stage
  isClosed: boolean;           // Derived from stage
  // ... more fields
}
```

## HubSpot Integration

This pipeline is designed to work with the included HubSpot connector for seamless data integration:

```typescript
import { createHubSpotConnector } from "./hubspot";

const hubspot = createHubSpotConnector();
hubspot.initialize({ 
  auth: { type: "bearer", bearer: { token: process.env.HUBSPOT_TOKEN } }
});

// Stream deals to Moose pipeline
for await (const deal of hubspot.streamDeals({ pageSize: 100 })) {
  await fetch("http://localhost:4000/ingest/HubSpotDealRaw", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(deal)
  });
}
```

## Deployment

This pipeline is production-ready and can be deployed using:
- **Docker**: Container-based deployment
- **Cloud Platforms**: AWS, GCP, Azure
- **Kubernetes**: Helm charts available
- **Moose Cloud**: Managed hosting (coming soon)

## Monitoring & Observability

- **Health Checks**: `/health` endpoint for service monitoring
- **Dead Letter Queues**: Failed transformations tracked for debugging
- **Metrics**: Built-in performance and data quality metrics
- **Logs**: Structured logging for operational insights

## Built with Moose

[Moose](https://www.getmoose.dev/) is an open-source data engineering framework designed to drastically accelerate AI-enabled software developers, as you prototype and scale data-intensive features and applications.

### Community & Support

- 📖 **Documentation**: [docs.getmoose.dev](https://docs.getmoose.dev/)
- 💬 **Community Slack**: [Join here](https://join.slack.com/t/moose-community/shared_invite/zt-2fjh5n3wz-cnOmM9Xe9DYAgQrNu8xKxg)
- 🐛 **Issues**: [GitHub Issues](https://github.com/514-labs/moose/issues)
- 📧 **Enterprise Support**: [hello@moosejs.dev](mailto:hello@moosejs.dev)

### Contributing

We welcome contributions! Please check out the [contribution guidelines](https://github.com/514-labs/moose/blob/main/CONTRIBUTING.md).

---

**Made by [514](https://www.fiveonefour.com/)** - Bringing incredible developer experiences to the data stack.

# Actual Budget MCP Server

MCP server for integrating Actual Budget with Claude and other LLM assistants.

## Overview

The Actual Budget MCP Server allows you to interact with your personal financial data from [Actual Budget](https://actualbudget.com/) using natural language through LLMs. It exposes your accounts, transactions, and financial metrics through the Model Context Protocol (MCP).

## Features

### Resources

- **Account Listings** - Browse all your accounts with their balances
- **Account Details** - View detailed information about specific accounts
- **Transaction History** - Access transaction data with complete details

### Tools

#### Transaction & Account Management

- **`get-transactions`** - Retrieve and filter transactions by account, date, amount, category, or payee
- **`get-accounts`** - Retrieve a list of all accounts with their current balance and ID
- **`balance-history`** - View account balance changes over time
- **`create-transaction`** - Create new transactions with all fields, automatically creating payees and categories if needed

#### Reporting & Analytics

- **`spending-by-category`** - Generate spending breakdowns categorized by type
- **`monthly-summary`** - Get monthly income, expenses, and savings metrics

#### Categories

- **`get-grouped-categories`** - Retrieve a list of all category groups with their categories
- **`create-category`** - Create a new category within a category group
- **`update-category`** - Update an existing category's name or group
- **`delete-category`** - Delete a category
- **`create-category-group`** - Create a new category group
- **`update-category-group`** - Update a category group's name
- **`delete-category-group`** - Delete a category group

#### Payees

- **`get-payees`** - Retrieve a list of all payees with their details
- **`create-payee`** - Create a new payee
- **`update-payee`** - Update an existing payee's details
- **`delete-payee`** - Delete a payee

#### Rules

- **`get-rules`** - Retrieve a list of all transaction rules
- **`create-rule`** - Create a new transaction rule with conditions and actions
- **`update-rule`** - Update an existing transaction rule
- **`delete-rule`** - Delete a transaction rule

#### Budget Management

- **`list-available-months`** - Get a list of all months with available budget data
- **`get-budget-month`** - Get detailed budget data for a specific month with complete category breakdowns
- **`get-budget-summary`** - Get high-level budget overview for a date range without category details
- **`get-category-budgets`** - Get budget data for specific categories in a month or range of months (efficient for targeted queries)
- **`set-budget-amount`** - Set the budget amount for a specific category in a given month
- **`set-budget-carryover`** - Enable or disable budget carryover for a specific category
- **`hold-budget-for-next-month`** - Hold a portion of the budget for the next month
- **`reset-budget-hold`** - Reset the budget hold for a month

### Prompts

- **`financial-insights`** - Generate insights and recommendations based on your financial data
- **`budget-review`** - Analyze your budget compliance and suggest adjustments

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Actual Budget](https://actualbudget.com/) installed and configured
- [Claude Desktop](https://claude.ai/download) or another MCP-compatible client
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (optional)

### Remote access

Pull the latest docker image:

```
docker pull sstefanov/actual-mcp:latest
```

### Local setup

1. Clone the repository:

```bash
git clone https://github.com/sstefanov/actual-mcp.git
cd actual-mcp
```

2. Install dependencies:

```bash
npm install
```

3. Build the server:

```bash
npm run build
```

4. Build the local docker image (optional):

```bash
docker build -t <local-image-name> .
```

5. Configure environment variables (optional):

```bash
# Path to your Actual Budget data directory (default: ~/.actual)
export ACTUAL_DATA_DIR="/path/to/your/actual/data"

# If using a remote Actual server
export ACTUAL_SERVER_URL="https://your-actual-server.com"
export ACTUAL_PASSWORD="your-password"

# Specific budget to use (optional)
export ACTUAL_BUDGET_SYNC_ID="your-budget-id"
```

## Usage with Claude Desktop

To use this server with Claude Desktop, add it to your Claude configuration:

On MacOS:

```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

On Windows:

```bash
code %APPDATA%\Claude\claude_desktop_config.json
```

Add the following to your configuration...

### a. Using Node.js (npx version):

```json
{
  "mcpServers": {
    "actualBudget": {
      "command": "node",
      "args": ["-y", "actual-mcp", "--enable-write"],
      "env": {
        "ACTUAL_DATA_DIR": "path/to/your/data",
        "ACTUAL_PASSWORD": "your-password",
        "ACTUAL_SERVER_URL": "http://your-actual-server.com",
        "ACTUAL_BUDGET_SYNC_ID": "your-budget-id"
      }
    }
  }
}

### a. Using Node.js (local only):

```json
{
  "mcpServers": {
    "actualBudget": {
      "command": "node",
      "args": ["/path/to/your/clone/build/index.js", "--enable-write"],
      "env": {
        "ACTUAL_DATA_DIR": "path/to/your/data",
        "ACTUAL_PASSWORD": "your-password",
        "ACTUAL_SERVER_URL": "http://your-actual-server.com",
        "ACTUAL_BUDGET_SYNC_ID": "your-budget-id"
      }
    }
  }
}
```

### b. Using Docker (local or remote images):

```json
{
  "mcpServers": {
    "actualBudget": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-v",
        "/path/to/your/data:/data",
        "-e",
        "ACTUAL_PASSWORD=your-password",
        "-e",
        "ACTUAL_SERVER_URL=https://your-actual-server.com",
        "-e",
        "ACTUAL_BUDGET_SYNC_ID=your-budget-id",
        "sstefanov/actual-mcp:latest",
        "--enable-write"
      ]
    }
  }
}
```

After saving the configuration, restart Claude Desktop.

> 💡 `ACTUAL_DATA_DIR` is optional if you're using `ACTUAL_SERVER_URL`.

> 💡 Use `--enable-write` to enable write-access tools.

## Running an SSE Server

To expose the server over a port using Docker:

```bash
docker run -i --rm \
  -p 3000:3000 \
  -v "/path/to/your/data:/data" \
  -e ACTUAL_PASSWORD="your-password" \
  -e ACTUAL_SERVER_URL="http://your-actual-server.com" \
  -e ACTUAL_BUDGET_SYNC_ID="your-budget-id" \
  -e BEARER_TOKEN="your-bearer-token" \
  sstefanov/actual-mcp:latest \
  --sse --enable-write --enable-bearer
```

> ⚠️ Important: When using --enable-bearer, the BEARER_TOKEN environment variable must be set.  
> 🔒 This is highly recommended if you're exposing your server via a public URL.

## Example Queries

Once connected, you can ask Claude questions like:

- "What's my current account balance?"
- "Show me my spending by category last month"
- "How much did I spend on groceries in January?"
- "What's my savings rate over the past 3 months?"
- "Analyze my budget and suggest areas to improve"
- "Create a transaction for $25.50 at Grocery Store in my Checking account for Food category"
- "Add a new expense of $100 for rent to my account"

## Development

For development with auto-rebuild:

```bash
npm run watch
```

### Testing the connection to Actual

To verify the server can connect to your Actual Budget data:

```bash
node build/index.js --test-resources
```

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. You can use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

## Project Structure

- `index.ts` - Main server implementation
- `types.ts` - Type definitions for API responses and parameters
- `prompts.ts` - Prompt templates for LLM interactions
- `utils.ts` - Helper functions for date formatting and more
- `src/core/` - Core functionality (data fetching, mapping, aggregation)
- `src/tools/` - Tool implementations organized by feature
- `src/utils/` - Shared utilities and response builders

### Standard Response Format

All tools in this MCP server return responses in a consistent, structured JSON format designed for easy parsing by LLMs and client applications. The response format varies based on the operation type:

#### Query Responses

Tools that retrieve data (e.g., `get-accounts`, `get-payees`, `get-grouped-categories`) return:

```json
{
  "operation": "query",
  "resourceType": "account",
  "summary": "Retrieved 5 accounts",
  "data": [...],
  "metadata": {
    "count": 5,
    "filters": {...},
    "period": { "start": "2024-01", "end": "2024-12" }
  }
}
```

#### Mutation Responses

Tools that create, update, or delete data return:

```json
{
  "operation": "create",
  "resourceType": "category",
  "summary": "Created 1 category (ID: cat-123)",
  "affected": {
    "ids": ["cat-123"],
    "count": 1
  },
  "metadata": {
    "warnings": [...],
    "changes": {
      "updatedFields": ["name", "amount"],
      "newValues": {...}
    }
  }
}
```

#### Report Responses

Tools that generate reports and analysis (e.g., `balance-history`, `monthly-summary`, `spending-by-category`) return:

```json
{
  "operation": "report",
  "resourceType": "balance-history",
  "summary": "Balance history for Checking from 2024-01 to 2024-12",
  "sections": [
    {
      "title": "Balance History",
      "content": "# Markdown formatted report...",
      "data": {...}
    }
  ],
  "data": [...],
  "metadata": {
    "period": { "start": "2024-01", "end": "2024-12" },
    "accountId": "acc-123",
    "accountName": "Checking"
  }
}
```

This standardized format ensures:
- **Consistency** across all tools
- **Easy parsing** by LLMs and applications
- **Rich metadata** for context and filtering
- **Structured data** alongside human-readable reports
- **Clear operation tracking** for debugging and logging

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

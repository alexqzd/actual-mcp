### 🔄 Project Awareness & Context

- **Use consistent naming conventions, file structure, and architecture patterns** throughout the codebase.
- **Follow the existing TypeScript project structure** and maintain consistency with established patterns.

### 🧱 Code Structure & Modularity

- **Never create a file longer than 500 lines of code.** If a file approaches this limit, refactor by splitting it into modules or helper files.
- **Organize code into clearly separated modules**, grouped by feature or responsibility.
  For Actual MCP server, this looks like:
  - **Main server** (`src/index.ts`): MCP server initialization and transport setup.
  - **MCP Integration**: Uses `@modelcontextprotocol/sdk` for server implementation.
  - **Actual Budget API** (`src/actual-api.ts`): Manages the connection lifecycle to Actual Budget data.
  - **Tools** (`src/tools/`): Each tool follows a consistent modular pattern:
    - `index.ts`: Schema definition and main handler.
    - `input-parser.ts`: Argument validation and parsing.
    - `data-fetcher.ts`: Data retrieval from external API.
    - `report-generator.ts`: Output formatting.
    - `types.ts`: Tool-specific type definitions.
  - **Core Utilities** (`src/core/`): Shared functionality for data fetching, input handling, aggregation, and mapping.
- **Use clear, consistent imports** (prefer relative imports within packages).
- **Use clear, consistent imports** (prefer relative imports within packages).
- **Use process.env** for environment variables.

### 🧪 Testing & Reliability

- **Always create Vitest unit tests for new features** (functions, classes, modules, etc).
- **Use TypeScript in tests** and maintain type safety throughout test suites.
- **After updating any logic**, check whether existing unit tests need to be updated. If so, do it.
- **Tests should be co-located** with source files using `.test.ts` naming convention.
  - Example: `src/core/data/fetch-accounts.ts` → `src/core/data/fetch-accounts.test.ts`
- **Use proper ESM module mocking** with `vi.mock()` for external dependencies.
- **Test commands available**:
  - `npm run test` - Run all tests once
  - `npm run test:unit:watch` - Run tests in watch mode
  - `npm run test:coverage` - Generate coverage reports
  - `npm run test:ui` - Open Vitest UI for interactive testing
- **Code quality commands**:
  - `npm run lint` - Run ESLint to check for code quality issues
  - `npm run lint:fix` - Auto-fix ESLint issues where possible
  - `npm run format` - Format code with Prettier
  - `npm run format:check` - Check if code is properly formatted
  - `npm run type-check` - Run TypeScript type checking without compilation
  - `npm run quality` - Run full quality check (lint + format + type-check)
- **Include comprehensive test coverage**:
  - 1 test for expected use (happy path)
  - 1 edge case (boundary conditions)
  - 1 failure case (error handling)
  - Mock external dependencies (actual-api.js, etc.)
- **Follow existing test patterns** in `src/core/` for consistency.

### 📎 Style & Conventions

- **Use TypeScript** as the primary language with strict type checking.
- **Follow ESLint and Prettier** configuration for consistent code formatting.
- **Use explicit type annotations** for function parameters and return types.
- **Prefer interfaces over types** for object shapes when possible.
- **Use JSDoc comments for complex functions** following TypeScript conventions:

  ```typescript
  /**
   * Brief summary of the function.
   *
   * @param param1 - Description of the parameter
   * @returns Description of the return value
   */
  function example(param1: string): Promise<Result> {
    // implementation
  }
  ```

- **Use `npm run build`** to compile TypeScript and **`npm run watch`** for development.
- **Follow Node.js/npm conventions** for package management and scripts.

### 📚 Documentation & Explainability

- **Update `README.md`** when new features are added, dependencies change, or setup steps are modified.
- **Comment non-obvious code** and ensure everything is understandable to a mid-level developer.
- When writing complex logic, **add an inline `# Reason:` comment** explaining the why, not just the what.

### 🧠 AI Behavior Rules

- **Never assume missing context. Ask questions if uncertain.**
- **Never hallucinate libraries or functions** – only use known, verified npm packages.
- **Check package.json dependencies** before using any external libraries.
- **Use Context7 for up-to-date library documentation** when working with external packages or APIs.
- **Always confirm file paths and module names** exist before referencing them in code or tests.

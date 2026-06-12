# Development Prep

This note records the dependency setup and validation status for the monorepo without changing business logic, refactoring code, or modifying API behavior.

## Repository Layout

- `be/` - ASP.NET Core backend split into `Crm.Api`, `Crm.Application`, `Crm.Contracts`, `Crm.Domain`, and `Crm.Infrastructure`.
- `fe/` - React + Vite frontend.

## Local Toolchain Observed

- Node.js: `v20.15.1`
- npm: `10.7.0`
- .NET SDK: `8.0.100`
- .NET target framework used by backend projects: `net8.0`

## Frontend Dependencies

Location: `fe/`

Install command:

```powershell
npm install
```

Result: dependencies were already up to date.

Observed warning:

- `mute-stream@3.0.0` requires Node `^20.17.0 || >=22.9.0`; current Node is `v20.15.1`.

Audit status:

- `npm audit` reports 8 vulnerabilities: 7 moderate and 1 critical.
- Reported dependency paths include `vite`, `esbuild`, `react-router`, `react-router-dom`, and `vitest`.
- No automatic fix was applied because dependency upgrades may alter package behavior and should be approved separately.

Validation commands run:

```powershell
npm run lint
npm test
npm run build
```

Validation results:

- `npm run lint`: passed.
- `npm test`: passed, 13 test files and 61 tests.
- `npm run build`: passed.

Build note:

- Vite reported a chunk-size warning for a JavaScript bundle larger than 500 kB after minification. No build configuration changes were made.

Test note:

- Tests pass, but the output includes existing React Router future flag warnings and React `act(...)` warnings.

## Backend Dependencies

Location: `be/`

Backend projects:

- `Crm.Api/Crm.Api.csproj`
- `Crm.Application/Crm.Application.csproj`
- `Crm.Contracts/Crm.Contracts.csproj`
- `Crm.Domain/Crm.Domain.csproj`
- `Crm.Infrastructure/Crm.Infrastructure.csproj`

Restore command attempted before downgrade:

```powershell
dotnet restore be\Crm.Api\Crm.Api.csproj
```

Initial result: blocked by local SDK mismatch.

Reason:

- All backend projects targeted `net10.0`.
- The installed .NET SDK is `8.0.100`, which cannot restore/build `net10.0` projects.
- The machine has .NET 10 runtimes installed, but no .NET 10 SDK available to the `dotnet` CLI.

Downgrade action:

- Backend project target frameworks were changed from `net10.0` to `net8.0`.
- Microsoft and EF Core package references were aligned to compatible `8.x` versions.
- `ForwardedHeadersOptions.KnownIPNetworks` was replaced with the .NET 8 equivalent `KnownNetworks`.

Backend validation commands:

```powershell
dotnet restore be\Crm.Api\Crm.Api.csproj
dotnet build be\Crm.Api\Crm.Api.csproj
```

Backend validation results:

- `dotnet restore be\Crm.Api\Crm.Api.csproj`: passed after NuGet access was allowed.
- `dotnet build be\Crm.Api\Crm.Api.csproj`: passed with 0 warnings and 0 errors.

## Current Stage Status

- Frontend dependencies installed and validated.
- Backend dependency restore/build validation passed after downgrading to .NET 8.
- No feature work, refactoring, or API behavior changes were made.

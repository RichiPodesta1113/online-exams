# Diagrama de despliegue
```mermaid
flowchart LR
 GH[GitHub Actions] --> ACR[Azure Container Registry] --> API[Container App]
 GH --> FE[Frontend]
 API --> DB[(Azure PostgreSQL)]
```

resource "azurerm_resource_group" "main" { name="${var.project_name}-rg" location=var.location }
# Agrega aquí Container Registry, Container Apps, PostgreSQL y Static Web App
# después de configurar tu suscripción, nombres globalmente únicos y secretos.

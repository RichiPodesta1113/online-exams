resource "azurerm_resource_group" "main" {
  name     = "${var.project_name}-rg"
  location = var.location
}

resource "azurerm_container_registry" "main" {
  name                = "onlineexamsacr"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Basic"
  admin_enabled       = true
}

resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.project_name}-logs"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

resource "azurerm_container_app_environment" "main" {
  name                       = "${var.project_name}-environment"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
}

resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "${var.project_name}-postgres"
  resource_group_name    = azurerm_resource_group.main.name
  location               = azurerm_resource_group.main.location
  version                = "16"
  administrator_login    = var.postgres_admin
  administrator_password = var.postgres_password

  storage_mb = 32768
  sku_name   = "B_Standard_B1ms"

  backup_retention_days = 7
}

resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = "online_exams"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_container_app" "api" {
  name                         = "${var.project_name}-api"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"

  registry {
    server               = azurerm_container_registry.main.login_server
    username             = azurerm_container_registry.main.admin_username
    password_secret_name = "registry-password"
  }

  secret {
    name  = "registry-password"
    value = azurerm_container_registry.main.admin_password
  }

  secret {
    name = "database-connection"
    value = "Host=${azurerm_postgresql_flexible_server.main.fqdn};Port=5432;Database=online_exams;Username=${var.postgres_admin};Password=${var.postgres_password};SSL Mode=Require"
  }

  template {
    min_replicas = 1
    max_replicas = 2

    container {
      name   = "api"
      image  = "mcr.microsoft.com/dotnet/aspnet:8.0"
      cpu    = 0.5
      memory = "1Gi"

      env {
        name        = "ConnectionStrings__DefaultConnection"
        secret_name = "database-connection"
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 8080

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }
}
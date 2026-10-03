output "resource_group" {
  value = azurerm_resource_group.main.name
}

output "container_registry" {
  value = azurerm_container_registry.main.login_server
}

output "api_url" {
  value = "https://${azurerm_container_app.api.latest_revision_fqdn}"
}

output "postgres_server" {
  value = azurerm_postgresql_flexible_server.main.fqdn
}
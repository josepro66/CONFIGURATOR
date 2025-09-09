# Script para probar webhook de Beato16
Write-Host "Enviando webhook simulado para Beato16..." -ForegroundColor Green

# Datos específicos de Beato16
$body = @{
    reference_sale = "BEATO16-TEST-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    value = "250.00"
    currency = "USD"
    state_pol = "4"
    response_message_pol = "APPROVED"
    extra1 = "Beato16"
    extra2 = "Verde"
    extra3 = "Beato16 - Chasis: Verde, Botones: 16, Knobs: 4, Faders: 4, Teclas: 8 | Botones: Naranja, Negro, Naranja, Negro, Negro, Negro, Negro, Negro, Negro, Negro, Negro, Negro, Naranja, Negro, Naranja, Negro | Perillas: Negro, Amarillo, Negro, Negro | Email: cliente@correo.com"
    extra4 = "Configurador Beato 16 - USD $250.00"
    extra5 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A"
    extra6 = "Naranja, Negro, Naranja, Negro, Negro, Negro, Negro, Negro, Negro, Negro, Negro, Negro, Naranja, Negro, Naranja, Negro"
    extra7 = "Negro, Amarillo, Negro, Negro"
    extra8 = "Negro, Negro, Negro, Negro"
    extra9 = "Negro, Negro, Negro, Negro, Negro, Negro, Negro, Negro"
    buyerEmail = "cliente@correo.com"
    description = "Configurador Beato 16 - USD $250.00"
} | ConvertTo-Json

Write-Host "Body: $body" -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "https://37afce6068d0.ngrok-free.app/api/simulate-payu-webhook" -Method POST -ContentType "application/json" -Body $body
    Write-Host "✅ Respuesta exitosa:" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "❌ Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

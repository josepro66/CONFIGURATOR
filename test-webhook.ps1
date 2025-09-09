# Script para probar el webhook simulado de PayU con datos del modal
$body = @{
    reference_sale = "BEATO8-TEST-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    value = "185.00"
    currency = "USD"
    extra1 = "Beato8"
    extra2 = "Azul"
    extra3 = "Beato8 - Chasis: Azul, Botones: 8, Knobs: 4 | Botones: Negro, Negro, Negro, Negro, Negro, Negro, Negro, Negro | Perillas: Negro, Negro, Negro, Negro | Email: cliente@correo.com"
    extra4 = "Configurador Beato 8 - USD $185.00"
    extra5 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A"

    description = "Configurador Beato 8 - USD $185.00"
    buyerEmail = "cliente@correo.com"
} | ConvertTo-Json

Write-Host "Enviando webhook simulado con datos del modal..."
Write-Host "Body: $body"

try {
    $response = Invoke-WebRequest -Uri " https://37afce6068d0.ngrok-free.app/api/simulate-payu-webhook" -Method POST -ContentType "application/json" -Body $body
    Write-Host "✅ Respuesta exitosa:"
    Write-Host $response.Content
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)"
    Write-Host "Respuesta: $($_.Exception.Response)"
}

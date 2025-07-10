# OrgaSuite

## Bank API
{
  "title": "Bank API Documentation",
  "version": "1.0.0",
  "endpoints": {
    "GET /api/banks/lookup-iban/:iban": "Bankdaten anhand IBAN ermitteln",
    "GET /api/banks/lookup-blz/:blz": "Bankdaten anhand Bankleitzahl ermitteln",
    "GET /api/banks/lookup-bic/:bic": "Bankdaten anhand BIC ermitteln",
    "GET /api/banks/search?q=term": "Banken suchen (Autocomplete)",
    "GET /api/banks/status": "Status der Bankdatenbank",
    "POST /api/banks/batch-lookup": "Mehrere IBANs gleichzeitig prüfen"
  },
  "examples": {
    "iban_lookup": "/api/banks/lookup-iban/DE89370400440532013000",
    "bank_search": "/api/banks/search?q=Deutsche&limit=5",
    "status": "/api/banks/status"
  }
}

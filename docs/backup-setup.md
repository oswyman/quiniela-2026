# Configuración de Backup Automático — Firestore

## Objetivo
Exportar diariamente todos los datos de Firestore a Cloud Storage con retención de 30 días.
Costo estimado: < $0.05/mes para el volumen de La Cancha.

---

## Paso 1 — Habilitar la API de Firestore Admin

En Google Cloud Console del proyecto de Firebase:

```
gcloud services enable firestore.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
```

O desde la consola: APIs & Services → Enable APIs → buscar "Cloud Firestore API" y "Cloud Scheduler API".

---

## Paso 2 — Crear el bucket de Cloud Storage

```bash
# Reemplaza PROJECT_ID con tu ID de proyecto Firebase
gcloud storage buckets create gs://PROJECT_ID-backups \
  --location=us-central1 \
  --uniform-bucket-level-access
```

Agregar lifecycle rule para eliminar automáticamente exports de más de 30 días:

```bash
# Crear archivo lifecycle.json
cat > lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": { "type": "Delete" },
        "condition": { "age": 30 }
      }
    ]
  }
}
EOF

gcloud storage buckets update gs://PROJECT_ID-backups --lifecycle-file=lifecycle.json
```

---

## Paso 3 — Dar permisos a Firestore para escribir al bucket

```bash
PROJECT_ID=$(gcloud config get-value project)

gcloud storage buckets add-iam-policy-binding gs://PROJECT_ID-backups \
  --member=serviceAccount:service-$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')@gcp-sa-firestore.iam.gserviceaccount.com \
  --role=roles/storage.admin
```

---

## Paso 4 — Crear Cloud Scheduler job (export diario a las 3am CDMX)

```bash
gcloud scheduler jobs create http firestore-daily-backup \
  --schedule="0 9 * * *" \
  --uri="https://firestore.googleapis.com/v1/projects/PROJECT_ID/databases/(default):exportDocuments" \
  --message-body='{"outputUriPrefix": "gs://PROJECT_ID-backups/daily"}' \
  --oauth-service-account-email=PROJECT_ID@appspot.gserviceaccount.com \
  --location=us-central1 \
  --time-zone="America/Mexico_City"
```

> Nota: `schedule="0 9 * * *"` = 9am UTC = 3am hora Ciudad de México.

---

## Paso 5 — Verificar el primer backup

Ejecutar manualmente el primer export para confirmar que funciona:

```bash
gcloud firestore export gs://PROJECT_ID-backups/manual-test
```

Verificar en Cloud Storage que los archivos aparezcan:

```bash
gcloud storage ls gs://PROJECT_ID-backups/
```

---

## Paso 6 — Probar restore (obligatorio antes de go-live)

```bash
# Importar a un proyecto de prueba (NO al de producción)
gcloud firestore import gs://PROJECT_ID-backups/manual-test
```

Si el import completa sin errores, el backup es válido.

---

## Alternativa más simple: Firestore Point-in-Time Recovery (PITR)

Si prefieres no configurar Cloud Scheduler, PITR es más simple y se habilita con un solo comando:

```bash
gcloud firestore databases update --database="(default)" \
  --enable-pitr \
  --project=PROJECT_ID
```

Esto mantiene automáticamente 7 días de historial. Para recuperar:

```bash
gcloud firestore databases restore \
  --source-database="(default)" \
  --destination-database="restored-db" \
  --snapshot-time="2026-06-15T03:00:00Z"
```

**PITR tiene un costo adicional de almacenamiento** (~2x el tamaño de tu DB durante 7 días).
Para La Cancha esto sería < $0.01/mes adicional.

---

## Verificación mensual recomendada

Cada mes, ejecutar un restore de prueba para confirmar que los backups son recuperables.
Registrar la fecha de la prueba en este documento.

| Fecha | Backup restaurado | Resultado | Responsable |
|---|---|---|---|
| | | | |

{{/*
  Shared helpers. Every template loops .Values.services, so most helpers take
  the service entry as the context and the chart root as a second argument.
*/}}

{{- define "hms.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "hms.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
hms
{{- end -}}
{{- end -}}

{{/* hms.serviceName expects a dict: (dict "root" $ "svc" .) */}}
{{- define "hms.serviceName" -}}
{{- printf "%s-%s" (include "hms.fullname" .root) .svc.name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "hms.commonLabels" -}}
app.kubernetes.io/part-of: hms
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" }}
{{- end -}}

{{/* hms.selectorLabels expects (dict "root" $ "svc" .) */}}
{{- define "hms.selectorLabels" -}}
app.kubernetes.io/name: hms
app.kubernetes.io/instance: {{ .root.Release.Name }}
app.kubernetes.io/component: {{ .svc.name }}
{{- end -}}

{{/*
  hms.image resolves the image reference from image.mode.

  per-service -> registry/hms-<name>:tag
  all-in-one  -> registry/hms-platform:tag with SERVICE=<name>

  Both modes take the SAME image.tag, because CI builds all nine images from
  one commit and tags them identically. Switching a cluster from per-service to
  all-in-one during a recovery is a one-line values change with no rebuild.
*/}}
{{- define "hms.image" -}}
{{- $repo := printf "hms-%s" .svc.name -}}
{{- if eq .root.Values.image.mode "all-in-one" -}}
{{- $repo = "hms-platform" -}}
{{- end -}}
{{- $tag := .root.Values.image.tag | default .root.Chart.AppVersion -}}
{{- printf "%s/%s:%s" .root.Values.image.registry $repo $tag -}}
{{- end -}}

{{/* Merge a service's resources over defaults.resources */}}
{{- define "hms.resources" -}}
{{- $res := .svc.resources | default .root.Values.defaults.resources -}}
{{- toYaml $res -}}
{{- end -}}

{{- define "hms.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default "hms" .Values.serviceAccount.name -}}
{{- else -}}
default
{{- end -}}
{{- end -}}

{{/*
  Env shared by every service. Connection strings come from the projected
  secret rather than from here: a URL with a password in a values file ends up
  in `helm get values` and in anyone's shell history.
*/}}
{{- define "hms.commonEnv" -}}
- name: SERVICE
  value: {{ .svc.name }}
- name: PORT
  value: {{ .svc.port | quote }}
- name: POD_NAME
  valueFrom:
    fieldRef:
      fieldPath: metadata.name
- name: POD_NAMESPACE
  valueFrom:
    fieldRef:
      fieldPath: metadata.namespace
- name: NODE_NAME
  valueFrom:
    fieldRef:
      fieldPath: spec.nodeName
- name: OTEL_SERVICE_NAME
  value: {{ printf "hms-%s" .svc.name }}
- name: OTEL_RESOURCE_ATTRIBUTES
  value: {{ printf "service.name=hms-%s,service.namespace=hms,deployment.environment=%s" .svc.name .root.Release.Namespace }}
- name: DATABASE_POOL_MAX
  value: {{ .root.Values.database.poolMax | quote }}
- name: DATABASE_STATEMENT_TIMEOUT
  value: {{ .root.Values.database.statementTimeout | default "15s" | quote }}
- name: S3_ENDPOINT
  value: {{ .root.Values.storage.endpoint | quote }}
- name: S3_REGION
  value: {{ .root.Values.storage.region | quote }}
- name: S3_FORCE_PATH_STYLE
  value: {{ .root.Values.storage.forcePathStyle | quote }}
- name: S3_BUCKET_DOCUMENTS
  value: {{ .root.Values.storage.buckets.documents | quote }}
- name: S3_BUCKET_PRESCRIPTIONS
  value: {{ .root.Values.storage.buckets.prescriptions | quote }}
- name: S3_BUCKET_INVOICES
  value: {{ .root.Values.storage.buckets.invoices | quote }}
- name: S3_BUCKET_LAB
  value: {{ .root.Values.storage.buckets.lab | quote }}
{{- end -}}
